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
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (reply as any).log?.info({ conversationId: conversation.id }, '[agent] new-task created');
        } catch (_) {}
        reply.status(201).send({ conversationId: conversation.id });
    });

    app.get('/api/agent/stream', async (request, reply) => {
        const { conversationId, message } = request.query as {
            conversationId?: string;
            message?: string;
        };

        // basic request log (avoid logging raw message fully)
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (reply as any).log?.info(
                { conversationId, messageLen: message?.length ?? 0 },
                '[agent] stream request'
            );
        } catch (_) {}

        if (!conversationId) return reply.status(400).send({ error: 'conversationId is required' });
        if (!message?.trim()) return reply.status(400).send({ error: 'message is required' });

        const sse = setupSse(reply);
        const conversation = ensureConversation(conversationId);
        const userMessage = appendMessage(conversation.id, 'user', message.trim());

        sse.send('start', { conversationId: conversation.id, messageId: userMessage.id });
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (reply as any).log?.debug(
                { conversationId: conversation.id, userMessageId: userMessage.id },
                '[agent] sse start sent'
            );
        } catch (_) {}

        try {
            const { model, config } = await getGeminiModel(tools);
            const history = convertMessagesToHistory(getMessages(conversation.id).slice(0, -1));
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (reply as any).log?.debug(
                    {
                        conversationId: conversation.id,
                        historyLen: history.length,
                        lastRole: history[history.length - 1]?.role,
                        model: config.model,
                        hasSystemInstruction: Boolean(config.systemInstruction),
                        toolsCount: tools?.[0]?.functionDeclarations?.length ?? 0,
                    },
                    '[agent] prepared model call context'
                );
            } catch (_) {}

            // Kick off a single-turn generation. If a function call is returned, handle it and loop.
            // In @google/genai v1, function calling can be returned in the response candidates.
            let prompt = message.trim();
            // eslint-disable-next-line no-constant-condition
            while (true) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (reply as any).log?.debug(
                        {
                            conversationId: conversation.id,
                            promptPreview: prompt.slice(0, 120),
                            promptLen: prompt.length,
                        },
                        '[agent] generating content'
                    );
                } catch (_) {}
                const result: any = await model.generateContent({
                    model: config.model,
                    systemInstruction: config.systemInstruction
                        ? { role: 'system', parts: [{ text: config.systemInstruction }] }
                        : undefined,
                    contents: [...history, { role: 'user', parts: [{ text: prompt }] }],
                    tools,
                });
                const candidate = result?.response?.candidates?.[0];
                try {
                    const finishReason = candidate?.finishReason || result?.response?.candidates?.[0]?.finishReason;
                    const safety = candidate?.safetyRatings || result?.response?.promptFeedback || undefined;
                    const partsSummary = candidate?.content?.parts?.map((p: any) => {
                        if (p.functionCall) return { functionCall: { name: p.functionCall.name, argsKeys: Object.keys(p.functionCall.args || {}) } };
                        if (p.text) return { textLen: p.text.length, preview: String(p.text).slice(0, 60) };
                        return { other: Object.keys(p).join(',') };
                    });
                    (reply as any).log?.debug({ finishReason, safety, partsSummary }, '[agent] model candidate summary');
                } catch (_) {}
                const call = candidate?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;
                if (call) {
                    try {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (reply as any).log?.info(
                            {
                                conversationId: conversation.id,
                                toolName: call.name,
                                argsKeys: call.args ? Object.keys(call.args) : [],
                            },
                            '[agent] tool call received from model'
                        );
                    } catch (_) {}
                    appendMessage(conversation.id, 'assistant', JSON.stringify({ tool_code: { name: call.name, args: call.args } }));
                    const fn = (toolFunctions as any)[call.name];
                    const functionResult = fn
                        ? await (async () => {
                              switch (call.name) {
                                  case 'getAllMonsters':
                                      try { (reply as any).log?.debug('[agent] exec getAllMonsters'); } catch (_) {}
                                      return await toolFunctions.getAllMonsters();
                                  case 'getMonstersInfo':
                                      try { (reply as any).log?.debug({ level: call.args.level }, '[agent] exec getMonstersInfo'); } catch (_) {}
                                      return await toolFunctions.getMonstersInfo(call.args.level as number);
                                  case 'updMonsterInfo':
                                      try { (reply as any).log?.debug({ id: call.args?.monsterData?.id }, '[agent] exec updMonsterInfo'); } catch (_) {}
                                      return await toolFunctions.updMonsterInfo(call.args.monsterData as any);
                                  case 'simBattle':
                                      try { (reply as any).log?.debug({ monsterId: call.args.monsterId, playerLevel: call.args.playerLevel }, '[agent] exec simBattle'); } catch (_) {}
                                      return await toolFunctions.simBattle(call.args.monsterId as string, call.args.playerLevel as number);
                                  default:
                                      try { (reply as any).log?.warn({ toolName: call.name }, '[agent] missing tool implementation'); } catch (_) {}
                                      return `Error: Tool "${call.name}" has no implementation.`;
                              }
                          })()
                        : `Error: Tool "${call.name}" not found.`;
                    try {
                        (reply as any).log?.debug(
                            {
                                conversationId: conversation.id,
                                toolName: call.name,
                                resultLen: typeof functionResult === 'string' ? functionResult.length : JSON.stringify(functionResult).length,
                            },
                            '[agent] tool result summary'
                        );
                    } catch (_) {}
                    // Optionally record tool result as assistant content, but not required for flow.
                    // appendMessage(conversation.id, 'assistant', functionResult);
                    // Feed tool result back into the loop as next user content
                    prompt = functionResult;
                    // And continue to allow the model to produce a final text
                    continue;
                } else {
                    const text = result?.response?.text?.() ?? candidate?.content?.parts?.map((p: any) => p.text).join('') ?? '';
                    try {
                        (reply as any).log?.info(
                            { conversationId: conversation.id, textLen: text.length, preview: text.slice(0, 160) },
                            '[agent] final text from model'
                        );
                    } catch (_) {}
                    await streamToClient(sse, conversation.id, text);
                    try {
                        (reply as any).log?.debug(
                            { conversationId: conversation.id },
                            '[agent] sse done sent'
                        );
                    } catch (_) {}
                    break;
                }
            }
        } catch (error) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (reply as any).log?.error({ err: error }, '[agent] route error');
            } catch (_) {}
            const err = error as Error;
            sse.send('agent-error', {
                message: err?.message || 'Unknown error while generating Gemini response',
            });
        } finally {
            sse.close();
        }
    });
}
