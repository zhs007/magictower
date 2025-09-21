import type { FastifyInstance } from 'fastify';

import {
    appendMessage,
    createConversation,
    ensureConversation,
    getMessages,
} from './conversation-store';
import { getGeminiModel } from './gemini-client';
import { setupSse } from './sse';

function convertMessagesForGemini(messages: ReturnType<typeof getMessages>) {
    return messages.map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
    }));
}

function extractChunkText(chunk: any): string {
    if (!chunk) return '';
    if (typeof chunk.text === 'function') {
        const text = chunk.text();
        if (text) return text;
    }

    const candidates = chunk.candidates;
    if (Array.isArray(candidates) && candidates.length > 0) {
        const parts = candidates[0]?.content?.parts;
        if (Array.isArray(parts)) {
            return parts
                .map((part: any) => part?.text || '')
                .filter(Boolean)
                .join('');
        }
    }

    return '';
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

        if (!conversationId) {
            reply.status(400).send({ error: 'conversationId is required' });
            return;
        }

        if (!message || !message.trim()) {
            reply.status(400).send({ error: 'message is required' });
            return;
        }

        const sse = setupSse(reply);
        const conversation = ensureConversation(conversationId);
        const userMessage = appendMessage(conversation.id, 'user', message.trim());

        sse.send('start', {
            conversationId: conversation.id,
            messageId: userMessage.id,
        });

        try {
            const { model } = await getGeminiModel();
            const contents = convertMessagesForGemini(getMessages(conversation.id));

            const streamResult = await model.generateContentStream({ contents });
            let aggregated = '';

            for await (const chunk of streamResult.stream) {
                const text = extractChunkText(chunk);
                if (!text) continue;
                aggregated += text;
                sse.send('chunk', { text });
            }

            if (!aggregated.trim()) {
                aggregated = '';
            }

            const assistantMessage = appendMessage(conversation.id, 'assistant', aggregated);

            await streamResult.response.catch(() => null);

            sse.send('done', {
                conversationId: conversation.id,
                messageId: assistantMessage.id,
                content: assistantMessage.content,
            });
        } catch (error) {
            const err = error as Error;
            sse.send('agent-error', {
                message: err?.message || 'Unknown error while generating Gemini response',
            });
        } finally {
            sse.close();
        }
    });
}
