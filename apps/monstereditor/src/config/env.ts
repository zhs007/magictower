import { existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

import { config as loadDotenv } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const projectRoot = resolve(__dirname, '../../..');
let envLoaded = false;

export function loadEnvOnce() {
  if (envLoaded) return;
  envLoaded = true;
  const envPath = resolve(projectRoot, '.env');
  if (existsSync(envPath)) {
    loadDotenv({ path: envPath, override: false });
  } else {
    loadDotenv({ override: false });
  }
}

export function resolveProjectPath(...segments: string[]) {
  return resolve(projectRoot, ...segments);
}

export function getProjectRoot() {
  return projectRoot;
}
