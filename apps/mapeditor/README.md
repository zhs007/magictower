# Map Editor — Development README

This README explains how to run the Map Editor during development, what servers are involved, API endpoints, and troubleshooting tips.

## Overview
The Map Editor frontend is served by Vite (client dev server) and the backend API is served by a small Fastify server during development. For reliable dev behavior we run these two processes concurrently:

- Vite dev server — serves JS modules, HMR, and the client UI (http://localhost:5173)
- Fastify API server — serves REST endpoints and asset images (http://127.0.0.1:3000)

Vite is configured to proxy API and asset requests to the Fastify server so the browser can fetch JSON and images from `/api` and `/assets` paths.

## Commands
Run these from the repository root.

Start the API server (Fastify):

```bash
pnpm --filter @proj-tower/mapeditor run dev:server
```

Start the Vite client dev server (in another terminal):

```bash
pnpm --filter @proj-tower/mapeditor dev
```

Open: http://localhost:5173/

## Important files
- `apps/mapeditor/vite.config.ts` — Vite config and dev proxy (`/api` and `/assets` proxied to `http://127.0.0.1:3000`)
- `apps/mapeditor/src/app.ts` — Fastify app factory used by the runner; registers REST routes and serves `index.html` for navigation requests
- `apps/mapeditor/src/run-server.ts` — small runner that imports the app and starts the Fastify server using `tsx`

## API Endpoints (dev)
- GET `/api/maps` — returns list of map ids (derived from `mapdata/*.json` in repo root)
- GET `/api/maps/:mapId` — returns a specific map JSON
- POST `/api/maps/:mapId` — saves a map JSON
- GET `/api/assets/tiles` — returns list of tile asset names (derived from `assets/map/*.png` in repo root)
- GET `/assets/map/:file` — serves PNG asset files (used by the client)

## Troubleshooting
- 500 errors from `/api` or `/assets`: ensure the Fastify API server is running on `127.0.0.1:3000` (start `dev:server` first). Vite proxies to that address.
- `Unexpected token '<'` JSON parse errors: usually caused by the API returning HTML (index.html). Verify the request was proxied to the API server and the API returned JSON. Use browser Network tab to inspect response body and headers.
- `Asset id ... was not found in the Cache` Pixi warnings: ensure the asset endpoint returns a PNG (Content-Type `image/png`). Check Network tab for `/assets/map/*.png` responses.
- Port in use errors when starting API: find and stop the process using port 3000 (`lsof -i :3000 -t` then `kill <pid>`), or change `src/run-server.ts` to use a different port.

## Notes and future improvements
- We use a repo-root relative path for `mapdata` and `assets`. If you move the project structure, adjust `apps/mapeditor/src/app.ts` accordingly or implement dynamic repo-root detection.
- Optionally the project can run Vite and Fastify in a single process using `vite-plugin-fastify` in dev mode, but that can cause module-serving conflicts; the separate-process flow is simpler and more reliable.

If you'd like, I can:
- Add a small health-check endpoint and a script that launches both servers in parallel.
- Implement dynamic repo-root detection in `app.ts` so it works regardless of repo layout.

