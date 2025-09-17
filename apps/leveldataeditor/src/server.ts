import fastify from 'fastify';
import { readFile, writeFile } from 'fs/promises';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { DataManager } from '@proj-tower/logic-core';

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const rootDir = resolve(__dirname, '../../..');
const gamedataDir = resolve(rootDir, 'gamedata');

function registerRoutes(app: any) {
  const dataManager = new DataManager();

  app.get('/api/leveldata', async (request: any, reply: any) => {
    try {
      // Although DataManager can load all data, for this editor,
      // we only need to read the raw leveldata.json file.
      const levelDataPath = join(gamedataDir, 'leveldata.json');
      const data = await readFile(levelDataPath, 'utf-8');
      reply.send(JSON.parse(data));
    } catch (err) {
      app.log?.error?.(err);
      reply.status(500).send({ error: 'Failed to read leveldata.json' });
    }
  });

  app.post('/api/leveldata', async (request: any, reply: any) => {
    try {
      const levelDataPath = join(gamedataDir, 'leveldata.json');
      const data = JSON.stringify(request.body, null, 2);
      await writeFile(levelDataPath, data, 'utf-8');
      reply.send({ success: true });
    } catch (err) {
      app.log?.error?.(err);
      reply.status(500).send({ error: 'Failed to save leveldata.json' });
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
