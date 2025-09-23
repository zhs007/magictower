import type { FastifyInstance } from 'fastify';
import { appendMessage, createConversation, ensureConversation } from './conversation-store';
import { runAgentTurn, runAgentTurnStream } from './gemini-client';
import { setupSse } from './sse';


async function streamToClient(sse: ReturnType<typeof setupSse>, conversationId: string, text: string) {
    // No need to stream chunk by chunk for this task, just send the whole message
    sse.send('chunk', { text });
    sse.send('done', {
        conversationId: conversationId,
        content: text,
    });
}


export function registerAgentRoutes(app: FastifyInstance) {
    app.post('/api/agent/new-task', async (_request, reply) => {
        const conversation = createConversation();
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (reply as any).log?.info({ conversationId: conversation.id }, '[agent] new-task created');
        } catch (_) {}
        // Also alias as sessionId for frontend clarity
        reply.status(201).send({ conversationId: conversation.id, sessionId: conversation.id });
    });

    app.get('/api/agent/stream', async (request, reply) => {
        const { conversationId: cid, sessionId, message } = request.query as {
            conversationId?: string;
            sessionId?: string;
            message?: string;
        };
        const conversationId = cid || sessionId; // support either param name

        // basic request log (avoid logging raw message fully)
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (reply as any).log?.info(
                { conversationId, messageLen: message?.length ?? 0 },
                '[agent] stream request'
            );
        } catch (_) {}

    if (!conversationId) return reply.status(400).send({ error: 'conversationId (sessionId) is required. Create one via /api/agent/new-task.' });
        if (!message?.trim()) return reply.status(400).send({ error: 'message is required' });

        const sse = setupSse(reply);
    const conversation = ensureConversation(conversationId);

    sse.send('start', { conversationId: conversation.id });
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (reply as any).log?.debug(
                { conversationId: conversation.id },
                '[agent] sse start sent'
            );
        } catch (_) {}

        try {
            // Stream progressively using Chat
            let aggregated = '';
            const { text } = await runAgentTurnStream(
                conversation.id,
                message.trim(),
                async (chunkText) => {
                    aggregated += chunkText;
                    sse.send('chunk', { text: chunkText });
                }
            );
            await streamToClient(sse, conversation.id, text);
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
