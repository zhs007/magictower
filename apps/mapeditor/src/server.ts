import Fastify from 'fastify';
import fastifyDev from 'vite-plugin-fastify';
import { readdir, readFile, writeFile } from 'fs/promises';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const app = Fastify({
  logger: true,
});

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const rootDir = resolve(__dirname, '../../../../');
const mapDir = resolve(rootDir, 'mapdata');
const assetsDir = resolve(rootDir, 'assets/map');

// Route to get list of map files
app.get('/api/maps', async (request, reply) => {
  try {
    const files = await readdir(mapDir);
    const mapFiles = files.filter(file => file.endsWith('.json')).map(file => file.replace('.json', ''));
    return mapFiles;
  } catch (err) {
    app.log.error(err);
    reply.status(500).send({ error: 'Failed to read map directory' });
  }
});

// Route to get list of tile assets
app.get('/api/assets/tiles', async (request, reply) => {
    try {
        const files = await readdir(assetsDir);
        // Return filenames without extension, as these are used to build aliases
        const imageFiles = files
            .filter(file => file.endsWith('.png'))
            .map(file => file.replace('.png', ''));
        return imageFiles;
    } catch (err) {
        app.log.error(err);
        reply.status(500).send({ error: 'Failed to read assets directory' });
    }
});

// Route to get a specific map's data
app.get('/api/maps/:mapId', async (request, reply) => {
    const { mapId } = request.params as { mapId: string };
    const filePath = join(mapDir, `${mapId}.json`);
    try {
        const data = await readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        app.log.error(err);
        reply.status(404).send({ error: `Map ${mapId} not found` });
    }
});

// Route to save a specific map's data
app.post('/api/maps/:mapId', async (request, reply) => {
    const { mapId } = request.params as { mapId: string };
    const filePath = join(mapDir, `${mapId}.json`);
    try {
        const mapData = JSON.stringify(request.body, null, 2);
        await writeFile(filePath, mapData, 'utf-8');
        return { success: true };
    } catch (err) {
        app.log.error(err);
        reply.status(500).send({ error: `Failed to save map ${mapId}` });
    }
});


// Export the Fastify instance for the vite plugin to use. The vite-plugin-fastify
// will import this file and handle registering itself. Do NOT register the
// plugin here to avoid recursive registration / plugin timeouts.
export function createApp() {
  return app;
}

export default createApp;

// This is the entry point for the Fastify server
// when running in production mode.
if (process.env.NODE_ENV === 'production') {
  app.listen({ port: 3000 }, (err, address) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
    console.log(`Server listening at ${address}`);
  });
}
