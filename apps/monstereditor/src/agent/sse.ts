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
    if (event) {
      res.write(`event: ${event}\n`);
    }
    const payload =
      typeof data === 'string' ? data : JSON.stringify(data);
    res.write(`data: ${payload}\n\n`);
  };

  const close = () => {
    res.end();
  };

  return { send, close, res };
}
