// @ts-ignore: dev env may not have @types/fastify installed during some CI/typecheck runs
import fastify from 'fastify';
import { readdir, readFile } from 'fs/promises';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

import { registerAgentRoutes } from './agent/routes';

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const rootDir = resolve(__dirname, '../../..');
const monstersDir = resolve(rootDir, 'gamedata', 'monsters');
const gamedataDir = resolve(rootDir, 'gamedata');

function registerRoutes(app: any) {
    // Endpoint to get the list of all monster files
    app.get('/api/monsters', async (request: any, reply: any) => {
        try {
            const files = await readdir(monstersDir);
            const monsterFiles = files
                .filter((f: string) => f.endsWith('.json'))
                .map((f: string) => f.replace('.json', ''));
            return monsterFiles;
        } catch (err) {
            app.log?.error?.(err);
            reply.status(500).send({ error: 'Failed to read monsters directory' });
        }
    });

    // Endpoint to get data for a specific monster
    app.get('/api/monsters/:id', async (request: any, reply: any) => {
        const { id } = request.params as { id: string };
        const filePath = join(monstersDir, `${id}.json`);
        try {
            const data = await readFile(filePath, 'utf-8');
            return JSON.parse(data);
        } catch (err) {
            app.log?.error?.(err);
            reply.status(404).send({ error: `Monster ${id} not found` });
        }
    });

    // Endpoint to get the level data
    app.get('/api/leveldata', async (request: any, reply: any) => {
        const filePath = join(gamedataDir, 'leveldata.json');
        try {
            const data = await readFile(filePath, 'utf-8');
            return JSON.parse(data);
        } catch (err) {
            app.log?.error?.(err);
            reply.status(500).send({ error: 'Failed to read leveldata.json' });
        }
    });

    // Serve the main index.html for the root and any other HTML-expecting route
    const serveIndex = async (request: any, reply: any) => {
        try {
            const indexPath = join(__dirname, '..', 'index.html');
            const html = await readFile(indexPath, 'utf-8');
            reply.header('Content-Type', 'text/html; charset=utf-8').send(html);
        } catch (err) {
            reply.status(500).send({ message: 'Failed to read index.html' });
        }
    };

    app.get('/', serveIndex);
    app.setNotFoundHandler(async (request: any, reply: any) => {
        const accept = (request.headers['accept'] || '') as string;
        if (request.method === 'GET' && accept.includes('text/html')) {
            return serveIndex(request, reply);
        }
        reply.status(404).send({ message: 'Not Found' });
    });

    registerAgentRoutes(app);
}

export default async function createApp() {
    const app = fastify({ logger: true });
    registerRoutes(app);

    // Add routing helper so a Vite plugin can forward raw req/res
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    app.routing = (req: any, res: any) => {
        (app.server as any).emit('request', req, res);
    };

    await app.ready();
    return app;
}
