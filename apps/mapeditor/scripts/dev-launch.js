#!/usr/bin/env node
const { spawn } = require('child_process');
const http = require('http');

function run(cmd, args, name) {
  const p = spawn(cmd, args, { stdio: 'inherit', shell: true });
  p.on('exit', (code) => {
    console.log(`${name} exited with ${code}`);
  });
  return p;
}

function waitFor(url, retries = 20, delayMs = 200) {
  return new Promise((resolve) => {
    let i = 0;
    function attempt() {
      const req = http.get(url, (res) => {
        res.destroy();
        resolve(true);
      });
      req.on('error', () => {
        i++;
        if (i >= retries) return resolve(false);
        setTimeout(attempt, delayMs);
      });
    }
    attempt();
  });
}

async function main() {
  console.log('Starting mapeditor API server (dev:server)...');
  const api = run('pnpm', ['--filter', '@proj-tower/mapeditor', 'run', 'dev:server'], 'dev:server');

  const ready = await waitFor('http://127.0.0.1:3000/api/maps', 40, 200);
  if (!ready) {
    console.error('API server did not become ready in time. Check logs.');
    process.exitCode = 1;
    return;
  }

  console.log('API server ready — starting Vite dev server...');
  const vite = run('pnpm', ['--filter', '@proj-tower/mapeditor', 'run', 'dev'], 'vite');

  ['SIGINT', 'SIGTERM'].forEach((s) => {
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
