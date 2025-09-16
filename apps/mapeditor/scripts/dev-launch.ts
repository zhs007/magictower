#!/usr/bin/env node
import { spawn } from 'child_process';
import http from 'http';
import { join } from 'path';

function run(cmd: string, args: string[], name: string) {
  const p = spawn(cmd, args, { stdio: 'inherit', shell: true });
  p.on('exit', (code) => {
    console.log(`${name} exited with ${code}`);
  });
  return p;
}

async function waitFor(url: string, retries = 20, delayMs = 200) {
  for (let i = 0; i < retries; i++) {
    try {
      await new Promise<void>((res, rej) => {
        const req = http.get(url, (r) => {
          r.destroy();
          res();
        });
        req.on('error', rej);
      });
      return true;
    } catch (err) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return false;
}

async function main() {
  // Start the API server
  console.log('Starting mapeditor API server (dev:server)...');
  const api = run('pnpm', ['--filter', '@proj-tower/mapeditor', 'run', 'dev:server'], 'dev:server');

  // Wait for it to be healthy
  const ready = await waitFor('http://127.0.0.1:3000/api/maps', 40, 200);
  if (!ready) {
    console.error('API server did not become ready in time. Check logs.');
    process.exitCode = 1;
    return;
  }

  console.log('API server ready — starting Vite dev server...');
  const vite = run('pnpm', ['--filter', '@proj-tower/mapeditor', 'run', 'dev'], 'vite');

  // forward SIGINT/SIGTERM to children
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  signals.forEach((s) => {
    process.on(s, () => {
      api.kill('SIGTERM');
      vite.kill('SIGTERM');
      process.exit();
    });
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
