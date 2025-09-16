import { readdir, readFile, writeFile } from 'fs/promises';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const rootDir = resolve(__dirname, '../../../../');
const mapDir = resolve(rootDir, 'mapdata');
const assetsDir = resolve(rootDir, 'assets/map');

/**
 * Register routes on the Fastify instance provided by vite-plugin-fastify.
 * This ensures Vite's middleware is mounted and module requests are
 * handled by Vite instead of our routes.
 */
export default function register(app: any, options?: any) {
  // Get list of map files
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

  // List tile assets
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

  // Get a specific map's data
  app.get('/api/maps/:mapId', async (request: any, reply: any) => {
    const { mapId } = request.params as { mapId: string };
    const filePath = join(mapDir, `${mapId}.json`);
    try {
      const data = await readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      app.log?.error?.(err);
      reply.status(404).send({ error: `Map ${mapId} not found` });
    }
  });

  // Save map data
  app.post('/api/maps/:mapId', async (request: any, reply: any) => {
    const { mapId } = request.params as { mapId: string };
    const filePath = join(mapDir, `${mapId}.json`);
    try {
      const mapData = JSON.stringify(request.body, null, 2);
      await writeFile(filePath, mapData, 'utf-8');
      return { success: true };
    } catch (err) {
      app.log?.error?.(err);
      reply.status(500).send({ error: `Failed to save map ${mapId}` });
    }
  });

  // Serve the SPA index for navigation requests
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

  return app;
}
