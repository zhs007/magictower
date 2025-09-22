import * as genai from '@google/genai';
import { loadGeminiConfig } from './config';
import { configureProxyFromEnv } from './proxy';

// Use the new client class from @google/genai v1.x
const GoogleGenAICtor = (genai as any).GoogleGenAI as new (opts: any) => any;

let cachedModels: Map<string, any> = new Map();

export async function getGeminiModel(tools?: any[]): Promise<{
    model: any;
    config: Awaited<ReturnType<typeof loadGeminiConfig>>;
}> {
    const config = await loadGeminiConfig();
    const cacheKey = tools ? JSON.stringify(tools) : 'no-tools';

    if (cachedModels.has(cacheKey)) {
        try {
            // eslint-disable-next-line no-console
            console.debug('[gemini] using cached model surface', {
                toolsCount: tools?.[0]?.functionDeclarations?.length ?? 0,
                model: config.model,
            });
        } catch (_) {}
        return { model: cachedModels.get(cacheKey)!, config };
    }

    configureProxyFromEnv();

    const client: any = new GoogleGenAICtor({ apiKey: config.apiKey });

    const systemInstruction = config.systemInstruction
        ? { role: 'system', parts: [{ text: config.systemInstruction }] }
        : undefined;

    // In @google/genai v1, generation APIs are exposed on `client.models.*`.
    // We return that surface as the model, and callers must pass `{ model: config.model, ... }` per request.
    const modelInstance = client.models;

    cachedModels.set(cacheKey, modelInstance);

    try {
        // eslint-disable-next-line no-console
        console.info('[gemini] created new model surface', {
            toolsCount: tools?.[0]?.functionDeclarations?.length ?? 0,
            hasSystemInstruction: Boolean(systemInstruction),
            model: config.model,
        });
    } catch (_) {}

    return { model: modelInstance, config };
}
