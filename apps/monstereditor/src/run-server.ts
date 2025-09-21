import http from 'http';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import { loadEnvOnce } from './config/env';

const start = async () => {
  try {
    loadEnvOnce();
    const { default: createApp } = await import('./server');
    const app: any = await createApp();

    const host = process.env.HOST || '0.0.0.0';
    const port = Number(process.env.PORT || 5173);

    // Create Vite in middleware mode and attach its HMR to our HTTP server
    const { createServer } = await import('vite');
    // Create HTTP server early so we can pass it to Vite HMR
    const httpServer = http.createServer((req, res) => {
      // Placeholder; real handler set after Vite is created
      res.statusCode = 503;
      res.end('Server initializing');
    });

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const vite = await createServer({
      root: resolve(__dirname, '..'),
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: 'custom',
    });

    // Compose request handling: let Vite handle first; if not handled, pass to Fastify
    const handler = (req: any, res: any) => {
      const url = req.url || '';
      // Route API requests to Fastify directly
      if (url.startsWith('/api')) {
        if (typeof app.routing === 'function') {
          app.routing(req, res);
        } else {
          (app.server as any).emit('request', req, res);
        }
        return;
      }
      vite.middlewares(req, res, () => {
        // Fallback to Fastify for anything Vite doesn't handle (like index.html)
        if (typeof app.routing === 'function') {
          app.routing(req, res);
        } else {
          (app.server as any).emit('request', req, res);
        }
      });
    };

    httpServer.removeAllListeners('request');
    httpServer.on('request', handler);

    await new Promise<void>((resolveStart, rejectStart) => {
      httpServer.listen(port, host, (err?: any) => {
        if (err) return rejectStart(err);
        resolveStart();
      });
    });
    console.log(`Monstereditor dev server listening on http://${host}:${port}`);

    // Graceful shutdown
    const shutdown = async () => {
      try {
        await vite.close();
        await app.close();
      } finally {
        httpServer.close();
        process.exit(0);
      }
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  }
};

start();
