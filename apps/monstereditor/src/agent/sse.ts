import type { FastifyReply } from 'fastify';
import type { ServerResponse } from 'http';

export interface SseStream {
    send: (event: string | null, data: unknown) => void;
    close: () => void;
    res: ServerResponse;
}

export function setupSse(reply: FastifyReply): SseStream {
    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
    });
    res.write(':ok\n\n');

    const send = (event: string | null, data: unknown) => {
        try {
            const payload = typeof data === 'string' ? data : JSON.stringify(data);
            // Log event type and payload size only (avoid sensitive content)
            // Fastify provides a logger on reply
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (reply as any).log?.debug({ event, size: payload.length }, '[sse] send');
            } catch (_) {
                // ignore logger failures
            }
        if (event) {
            res.write(`event: ${event}\n`);
        }
        res.write(`data: ${payload}\n\n`);
        } catch (err) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (reply as any).log?.error({ err }, '[sse] send error');
            } catch (_) {
                // ignore logger failures
            }
            throw err;
        }
    };

    const close = () => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (reply as any).log?.debug('[sse] close');
        } catch (_) {
            // ignore logger failures
        }
        res.end();
    };

    return { send, close, res };
}
