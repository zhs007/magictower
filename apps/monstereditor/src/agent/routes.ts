import type { FastifyInstance } from 'fastify';
import {
    appendMessage,
    createConversation,
    ensureConversation,
    getMessages,
    Message,
} from './conversation-store';
import { getGeminiModel } from './gemini-client';
import { setupSse } from './sse';
import { tools, toolFunctions } from './tools';
import * as genai from '@google/genai';

function convertMessagesToHistory(messages: Message[]): genai.Content[] {
    const history: genai.Content[] = [];
    for (const message of messages) {
        const role = message.role === 'assistant' ? 'model' : 'user';
        let parts: genai.Part[] = [];

        if (message.role === 'tool') {
            // This case should be handled by sending a FunctionResponsePart in the next message
            // but we need to create the history properly. We'll add the tool request from the model
            // and the tool response from the function.
            const lastMessage = history[history.length - 1];
            if (lastMessage && lastMessage.role === 'model') {
                 parts.push({
                    functionResponse: {
                        name: message.toolName!,
                        response: { content: message.content },
                    },
                });
                // This is tricky, the API expects a function response to follow a model's function call
                // We will rely on the startChat's history conversion
            }
            continue; // Skip adding a new history item for tool responses this way
        }

        try {
            const parsed = JSON.parse(message.content);
            if (parsed.tool_code) {
                parts.push({ functionCall: { name: parsed.tool_code.name, args: parsed.tool_code.args } });
            } else {
                parts.push({ text: message.content });
            }
        } catch (e) {
            parts.push({ text: message.content });
        }

        history.push({ role, parts });
    }
    return history;
}


async function streamToClient(sse: ReturnType<typeof setupSse>, conversationId: string, text: string) {
    const assistantMessage = appendMessage(conversationId, 'assistant', text);
    // No need to stream chunk by chunk for this task, just send the whole message
    sse.send('chunk', { text });
    sse.send('done', {
        conversationId: conversationId,
        messageId: assistantMessage.id,
        content: assistantMessage.content,
    });
}


export function registerAgentRoutes(app: FastifyInstance) {
    app.post('/api/agent/new-task', async (_request, reply) => {
        const conversation = createConversation();
        reply.status(201).send({ conversationId: conversation.id });
    });

    app.get('/api/agent/stream', async (request, reply) => {
        const { conversationId, message } = request.query as {
            conversationId?: string;
            message?: string;
        };

        if (!conversationId) return reply.status(400).send({ error: 'conversationId is required' });
        if (!message?.trim()) return reply.status(400).send({ error: 'message is required' });

        const sse = setupSse(reply);
        const conversation = ensureConversation(conversationId);
        const userMessage = appendMessage(conversation.id, 'user', message.trim());

        sse.send('start', { conversationId: conversation.id, messageId: userMessage.id });

        try {
            const { model } = await getGeminiModel(tools);

            // Rebuild history from our store for the chat session
            const history = convertMessagesToHistory(getMessages(conversation.id).slice(0, -1));
            const chat = model.startChat({ history });

            // Send the latest user message
            let result = await chat.sendMessage(message.trim());

            while (true) {
                const call = result.response.functionCall();

                if (call) {
                    appendMessage(conversation.id, 'assistant', JSON.stringify({ tool_code: { name: call.name, args: call.args } }));

                    const toolFunction = (toolFunctions as any)[call.name];
                    let functionResult: string;

                    if (toolFunction) {
                        console.log(`Calling tool: ${call.name} with args:`, call.args);

                        // Use a switch statement for robust argument handling
                        switch (call.name) {
                            case 'getAllMonsters':
                                functionResult = await toolFunctions.getAllMonsters();
                                break;
                            case 'getMonstersInfo':
                                functionResult = await toolFunctions.getMonstersInfo(call.args.level as number);
                                break;
                            case 'updMonsterInfo':
                                functionResult = await toolFunctions.updMonsterInfo(call.args.monsterData as any);
                                break;
                            case 'simBattle':
                                functionResult = await toolFunctions.simBattle(call.args.monsterId as string, call.args.playerLevel as number);
                                break;
                            default:
                                functionResult = `Error: Tool "${call.name}" has no implementation.`;
                        }
                    } else {
                        functionResult = `Error: Tool "${call.name}" not found.`;
                    }

                    appendMessage(conversation.id, 'tool', functionResult, call.name);

                    // Send the tool's result back to the model
                    result = await chat.sendMessage(functionResult);
                } else {
                    // It's a text response, end the loop
                    const text = result.response.text();
                    await streamToClient(sse, conversation.id, text);
                    break;
                }
            }
        } catch (error) {
            console.error('Agent route error:', error);
            const err = error as Error;
            sse.send('agent-error', {
                message: err?.message || 'Unknown error while generating Gemini response',
            });
        } finally {
            sse.close();
        }
    });
}
