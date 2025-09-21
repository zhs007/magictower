import { readFile } from 'fs/promises';
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
  const systemInstruction = await readFile(systemPath, 'utf-8');

  cachedConfig = {
    apiKey,
    model,
    systemInstruction: systemInstruction.trim(),
  };

  return cachedConfig;
}
