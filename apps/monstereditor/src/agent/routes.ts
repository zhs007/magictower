import type { FastifyInstance } from 'fastify';
import { appendMessage, createConversation, ensureConversation, getMessages } from './conversation-store';
import { getGeminiModel } from './gemini-client';
import { setupSse } from './sse';
import { tools, toolFunctions } from './tools';
function convertMessagesToHistory(messages: ReturnType<typeof getMessages>): any[] {
    const history: any[] = [];
    for (const message of messages) {
        const role = message.role === 'assistant' ? 'model' : 'user';
    let parts: any[] = [];

        // conversation-store only supports 'user' | 'assistant'

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
            const history = convertMessagesToHistory(getMessages(conversation.id).slice(0, -1));

            // Kick off a single-turn generation. If a function call is returned, handle it and loop.
            // In @google/genai v1, function calling can be returned in the response candidates.
            let prompt = message.trim();
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const result: any = await model.generateContent({
                    contents: [...history, { role: 'user', parts: [{ text: prompt }] }],
                    tools,
                });
                const candidate = result?.response?.candidates?.[0];
                const call = candidate?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;
                if (call) {
                    appendMessage(conversation.id, 'assistant', JSON.stringify({ tool_code: { name: call.name, args: call.args } }));
                    const fn = (toolFunctions as any)[call.name];
                    const functionResult = fn
                        ? await (async () => {
                              switch (call.name) {
                                  case 'getAllMonsters':
                                      return await toolFunctions.getAllMonsters();
                                  case 'getMonstersInfo':
                                      return await toolFunctions.getMonstersInfo(call.args.level as number);
                                  case 'updMonsterInfo':
                                      return await toolFunctions.updMonsterInfo(call.args.monsterData as any);
                                  case 'simBattle':
                                      return await toolFunctions.simBattle(call.args.monsterId as string, call.args.playerLevel as number);
                                  default:
                                      return `Error: Tool "${call.name}" has no implementation.`;
                              }
                          })()
                        : `Error: Tool "${call.name}" not found.`;
                    // Optionally record tool result as assistant content, but not required for flow.
                    // appendMessage(conversation.id, 'assistant', functionResult);
                    // Feed tool result back into the loop as next user content
                    prompt = functionResult;
                    // And continue to allow the model to produce a final text
                    continue;
                } else {
                    const text = result?.response?.text?.() ?? candidate?.content?.parts?.map((p: any) => p.text).join('') ?? '';
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
