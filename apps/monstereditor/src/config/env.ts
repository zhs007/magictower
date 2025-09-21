import { existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

import { config as loadDotenv } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const projectRoot = resolve(__dirname, '../../..');
const appDir = resolve(projectRoot, 'apps', 'monstereditor');
let envLoaded = false;

export function loadEnvOnce() {
    if (envLoaded) return;
    envLoaded = true;
    const candidates = [
        resolve(appDir, '.env.local'),
        resolve(appDir, '.env'),
        resolve(projectRoot, '.env.local'),
        resolve(projectRoot, '.env'),
    ];

    let loaded = false;
    for (const envPath of candidates) {
        if (!existsSync(envPath)) continue;
        loadDotenv({ path: envPath, override: false });
        loaded = true;
    }

    if (!loaded) {
        loadDotenv({ override: false });
    }
}

export function resolveProjectPath(...segments: string[]) {
    return resolve(projectRoot, ...segments);
}

export function getProjectRoot() {
    return projectRoot;
}
