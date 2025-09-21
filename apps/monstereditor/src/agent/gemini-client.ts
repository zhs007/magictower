import * as genai from '@google/genai';
import { loadGeminiConfig } from './config';
import { configureProxyFromEnv } from './proxy';

// Use the new client class from @google/genai v1.x
const { GoogleGenAI } = genai as unknown as { GoogleGenAI: new (opts: any) => any };

let cachedModels: Map<string, any> = new Map();

export async function getGeminiModel(tools?: any[]): Promise<{
    model: any;
    config: Awaited<ReturnType<typeof loadGeminiConfig>>;
}> {
    const config = await loadGeminiConfig();
    const cacheKey = tools ? JSON.stringify(tools) : 'no-tools';

    if (cachedModels.has(cacheKey)) {
        return { model: cachedModels.get(cacheKey)!, config };
    }

    configureProxyFromEnv();

    const client: any = new GoogleGenAI({ apiKey: config.apiKey });

    const systemInstruction = config.systemInstruction
        ? { role: 'system', parts: [{ text: config.systemInstruction }] }
        : undefined;

    // Create a model instance. In @google/genai, tools are typically passed per-request
    // so we don't include them in model creation to satisfy strict typings.
    const modelInstance = (client.models?.getGenerativeModel ?? client.getGenerativeModel).call(client.models ?? client, {
        model: config.model,
        systemInstruction,
    });

    cachedModels.set(cacheKey, modelInstance);

    return { model: modelInstance, config };
}
