import fastify from 'fastify';
import { readdir, readFile, writeFile } from 'fs/promises';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { normalizeMapLayout } from '@proj-tower/logic-core';

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const rootDir = resolve(__dirname, '../../..');
const mapDir = resolve(rootDir, 'mapdata');
const assetsDir = resolve(rootDir, 'assets', 'map');

function registerRoutes(app: any) {
  app.get('/api/maps', async (request: any, reply: any) => {
    try {
      const files = await readdir(mapDir);
      const mapFiles = files.filter((f: string) => f.endsWith('.json')).map((f: string) => f.replace('.json', ''));
      return mapFiles;
    } catch (err) {
      app.log?.error?.(err);
      reply.status(500).send({ error: 'Failed to read map directory' });
    }
  });

  app.get('/api/assets/tiles', async (request: any, reply: any) => {
    try {
      const files = await readdir(assetsDir);
      const imageFiles = files.filter((f: string) => f.endsWith('.png')).map((f: string) => f.replace('.png', ''));
      return imageFiles;
    } catch (err) {
      app.log?.error?.(err);
      reply.status(500).send({ error: 'Failed to read assets directory' });
    }
  });

  app.get('/api/maps/:mapId', async (request: any, reply: any) => {
    const { mapId } = request.params as { mapId: string };
    const filePath = join(mapDir, `${mapId}.json`);
    try {
      const data = await readFile(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      const fallbackFloor =
        typeof parsed?.floor === 'number'
          ? parsed.floor
          : Number.parseInt((mapId.match(/\d+/) ?? ['1'])[0], 10) || 1;
      return normalizeMapLayout(parsed, { floor: fallbackFloor });
    } catch (err) {
      app.log?.error?.(err);
      reply.status(404).send({ error: `Map ${mapId} not found` });
    }
  });

  app.post('/api/maps/:mapId', async (request: any, reply: any) => {
    const { mapId } = request.params as { mapId: string };
    const filePath = join(mapDir, `${mapId}.json`);
    try {
      const payload = request.body as unknown;
      const fallbackFloor =
        typeof (payload as any)?.floor === 'number'
          ? (payload as any).floor
          : Number.parseInt((mapId.match(/\d+/) ?? ['1'])[0], 10) || 1;
      const normalized = normalizeMapLayout(payload as any, { floor: fallbackFloor });
      await writeFile(filePath, JSON.stringify(normalized, null, 2), 'utf-8');
      return { success: true };
    } catch (err) {
      app.log?.error?.(err);
      reply.status(500).send({ error: `Failed to save map ${mapId}` });
    }
  });

  app.get('/', async (request: any, reply: any) => {
    try {
      const indexPath = join(__dirname, '..', 'index.html');
      const html = await readFile(indexPath, 'utf-8');
      reply.header('Content-Type', 'text/html; charset=utf-8').send(html);
    } catch (err) {
      reply.status(500).send({ message: 'Failed to read index.html' });
    }
  });

  app.setNotFoundHandler(async (request: any, reply: any) => {
    const accept = (request.headers['accept'] || '') as string;
    if (request.method === 'GET' && accept.includes('text/html')) {
      try {
        const indexPath = join(__dirname, '..', 'index.html');
        const html = await readFile(indexPath, 'utf-8');
        reply.header('Content-Type', 'text/html; charset=utf-8').send(html);
        return;
      } catch (err) {
        reply.status(500).send({ message: 'Failed to read index.html' });
        return;
      }
    }

    reply.status(404).send({ message: 'Not Found' });
  });

  app.get('/assets/map/:file', async (request: any, reply: any) => {
    const { file } = request.params as { file: string };
    let filePath = join(assetsDir, file);
    try {
      const data = await readFile(filePath);
      reply.header('Content-Type', 'image/png').send(data);
      return;
    } catch (err) {
      try {
        filePath = join(rootDir, 'assets', file);
        const data = await readFile(filePath);
        reply.header('Content-Type', 'image/png').send(data);
        return;
      } catch (err2) {
        app.log?.error?.(err2);
        reply.status(404).send({ error: 'Asset not found' });
        return;
      }
    }
  });
}

export default async function createApp() {
  const app = fastify({ logger: true });
  registerRoutes(app);

  // Add routing helper so the plugin can forward raw req/res
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  app.routing = (req: any, res: any) => {
    (app.server as any).emit('request', req, res);
  };

  await app.ready();
  return app;
}

// Keep a named export for compatibility if other code imports register
export { registerRoutes as register };
