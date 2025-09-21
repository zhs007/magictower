import { readFile } from 'fs/promises';
import { resolve, } from 'path';
import { fileURLToPath } from 'url';
import { resolveProjectPath, loadEnvOnce } from '../config/env';

export interface GeminiConfig {
  apiKey: string;
  model: string;
  systemInstruction: string;
}

let cachedConfig: GeminiConfig | null = null;

export async function loadGeminiConfig(): Promise<GeminiConfig> {
  if (cachedConfig) return cachedConfig;
  loadEnvOnce();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Please configure it in environment variables or .env');
  }

  const model = process.env.GEMINI_MODEL || 'models/gemini-1.5-flash';
  const systemPath = resolveProjectPath('apps', 'monstereditor', 'prompts', 'system.md');

  let systemInstruction: string;
  try {
    systemInstruction = await readFile(systemPath, 'utf-8');
  } catch (err) {
    // Fallback: sometimes projectRoot resolution can be different depending on
    // how the process is started. Try a path relative to this file instead.
    const thisDir = resolve(fileURLToPath(import.meta.url), '..');
    const fallback = resolve(thisDir, '..', '..', 'prompts', 'system.md');
    try {
      systemInstruction = await readFile(fallback, 'utf-8');
    } catch (err2) {
      // If both attempts fail, rethrow the original error for visibility
      throw err as Error;
    }
  }

  cachedConfig = {
    apiKey,
    model,
    systemInstruction: systemInstruction.trim(),
  };

  return cachedConfig;
}
