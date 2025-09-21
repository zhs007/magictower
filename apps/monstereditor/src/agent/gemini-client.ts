import * as genai from '@google/genai';
import { loadGeminiConfig } from './config';
import { configureProxyFromEnv } from './proxy';

// The import must be a namespace import, and we extract the class from it.
const { GoogleGenerativeAI } = genai;

let cachedModels: Map<string, genai.GenerativeModel> = new Map();

export async function getGeminiModel(tools?: genai.Tool[]): Promise<{
    model: genai.GenerativeModel;
    config: Awaited<ReturnType<typeof loadGeminiConfig>>;
}> {
    const config = await loadGeminiConfig();
    const cacheKey = tools ? JSON.stringify(tools) : 'no-tools';

    if (cachedModels.has(cacheKey)) {
        return { model: cachedModels.get(cacheKey)!, config };
    }

    configureProxyFromEnv();

    const client = new GoogleGenerativeAI(config.apiKey);

    const systemInstruction = config.systemInstruction
        ? { role: 'system', parts: [{ text: config.systemInstruction }] }
        : undefined;

    const modelInstance = client.getGenerativeModel({
        model: config.model,
        systemInstruction,
        tools,
    });

    cachedModels.set(cacheKey, modelInstance);

    return { model: modelInstance, config };
}
