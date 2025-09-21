import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const projectRoot = resolve(__dirname, '../../..');
let envLoaded = false;

function parseValue(raw: string) {
  let value = raw.trim();
  if (!value) return '';
  const isQuoted =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"));
  if (isQuoted) {
    value = value.slice(1, -1);
  }
  return value;
}

export function loadEnvOnce() {
  if (envLoaded) return;
  envLoaded = true;
  const envPath = resolve(projectRoot, '.env');
  if (!existsSync(envPath)) return;
  const contents = readFileSync(envPath, 'utf-8');
  const lines = contents.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const rawValue = trimmed.slice(eqIndex + 1);
    if (!key) continue;
    if (process.env[key] !== undefined) continue;
    process.env[key] = parseValue(rawValue);
  }
}

export function resolveProjectPath(...segments: string[]) {
  return resolve(projectRoot, ...segments);
}

export function getProjectRoot() {
  return projectRoot;
}
