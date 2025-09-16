// Compatibility entry: some dev tooling / plugins expect `src/app.ts` as the
// server entry. Re-export the real server implementation from `server.ts` so
// those tools can find it regardless of which entry name they try.
import fastify from 'fastify';
import { readdir, readFile, writeFile } from 'fs/promises';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
// repo root is three levels up from apps/mapeditor/src
const rootDir = resolve(__dirname, '../../..');
const mapDir = resolve(rootDir, 'mapdata');
const assetsDir = resolve(rootDir, 'assets', 'map');

export default function createApp() {
	const app = fastify({ logger: true });

	app.get('/api/maps', async (request, reply) => {
		try {
			const files = await readdir(mapDir);
			const mapFiles = files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
			return mapFiles;
		} catch (err) {
			app.log.error(err as Error);
			reply.status(500).send({ error: 'Failed to read map directory' });
		}
	});

	app.get('/api/assets/tiles', async (request, reply) => {
		try {
			const files = await readdir(assetsDir);
			const imageFiles = files.filter(f => f.endsWith('.png')).map(f => f.replace('.png', ''));
			return imageFiles;
		} catch (err) {
			app.log.error(err as Error);
			reply.status(500).send({ error: 'Failed to read assets directory' });
		}
	});

	app.get('/api/maps/:mapId', async (request, reply) => {
		const { mapId } = request.params as { mapId: string };
		const filePath = join(mapDir, `${mapId}.json`);
		try {
			const data = await readFile(filePath, 'utf-8');
			return JSON.parse(data);
		} catch (err) {
			app.log.error(err as Error);
			reply.status(404).send({ error: `Map ${mapId} not found` });
		}
	});

	app.post('/api/maps/:mapId', async (request, reply) => {
		const { mapId } = request.params as { mapId: string };
		const filePath = join(mapDir, `${mapId}.json`);
		try {
			const mapData = JSON.stringify(request.body, null, 2);
			await writeFile(filePath, mapData, 'utf-8');
			return { success: true };
		} catch (err) {
			app.log.error(err as Error);
			reply.status(500).send({ error: `Failed to save map ${mapId}` });
		}
	});

		// Serve map asset images directly
		app.get('/assets/map/:file', async (request, reply) => {
			const { file } = request.params as { file: string };
			// Try assets/map/<file> first
			let filePath = join(assetsDir, file);
			try {
				const data = await readFile(filePath);
				reply.header('Content-Type', 'image/png').send(data);
				return;
			} catch (err) {
				// fallback to repo-root assets/<file>
				try {
					filePath = join(rootDir, 'assets', file);
					const data = await readFile(filePath);
					reply.header('Content-Type', 'image/png').send(data);
					return;
				} catch (err2) {
					app.log.error(err2 as Error);
					reply.status(404).send({ error: 'Asset not found' });
					return;
				}
			}
		});

	// Serve SPA index for navigation requests
	app.get('/', async (request, reply) => {
		try {
			const indexPath = join(__dirname, '..', 'index.html');
			const html = await readFile(indexPath, 'utf-8');
			reply.header('Content-Type', 'text/html; charset=utf-8').send(html);
		} catch (err) {
			reply.status(500).send({ message: 'Failed to read index.html' });
		}
	});

	app.setNotFoundHandler(async (request, reply) => {
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

	// Add a helper so the vite plugin can forward raw req/res
	// into Fastify's HTTP server
	// (vite-plugin-fastify expects the returned app to have .ready() and .routing(req,res))
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	app.routing = (req: any, res: any) => {
		// Fastify's underlying server is a Node.js http server
		// We can emit 'request' to let Fastify handle it.
		(app.server as any).emit('request', req, res);
	};

	return app;
}
