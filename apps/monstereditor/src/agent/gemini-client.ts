import { loadGeminiConfig } from './config';
import { configureProxyFromEnv } from './proxy';

interface GenerativeModelLike {
    generateContentStream: (request: {
        contents: Array<{ role: string; parts: Array<{ text: string }> }>;
    }) => Promise<{
        stream: AsyncIterable<any>;
        response: Promise<any>;
    }>;
}

let cachedModel: GenerativeModelLike | null = null;

export async function getGeminiModel(): Promise<{
    model: GenerativeModelLike;
    config: Awaited<ReturnType<typeof loadGeminiConfig>>;
}> {
    if (cachedModel) {
        const config = await loadGeminiConfig();
        return { model: cachedModel, config };
    }

    const config = await loadGeminiConfig();
    configureProxyFromEnv();

    // Only support the latest @google/genai shape (GoogleGenAI) in this branch.
    // If you need backward compatibility, revert to previous implementation.
    const genaiModule: Record<string, any> = await import('@google/genai');
    const GoogleGenAI = genaiModule.GoogleGenAI || genaiModule.GoogleGenAIClient;

    if (!GoogleGenAI) {
        throw new Error(
            'Failed to load google/genai client (expected GoogleGenAI). Ensure @google/genai is installed.'
        );
    }

    const client = new GoogleGenAI({ apiKey: config.apiKey });

    const systemInstruction = config.systemInstruction
        ? { role: 'system', parts: [{ text: config.systemInstruction }] }
        : undefined;

    if (!client.models || typeof client.models.generateContentStream !== 'function') {
        throw new Error(
            'google/genai client (GoogleGenAI) does not expose models.generateContentStream.'
        );
    }

    // Use the library's models.generateContentStream directly and normalize its return
    const modelInstance: GenerativeModelLike = {
        generateContentStream: async (request: { contents: any[] }) => {
            const result = await client.models.generateContentStream({
                ...request,
                model: config.model,
                ...(systemInstruction ? { systemInstruction } : {}),
            });

            // Prefer an object with { stream, response }
            if (result && typeof result === 'object' && 'stream' in result) return result as any;

            // If an async iterable is returned directly, wrap it
            if (result && typeof result[Symbol.asyncIterator] === 'function') {
                return { stream: result, response: Promise.resolve() } as any;
            }

            // Otherwise return an empty stream response to avoid crashes
            return { stream: (async function* () {})(), response: Promise.resolve() } as any;
        },
    };

    cachedModel = modelInstance;
    return { model: modelInstance, config };

    if (!modelInstance || typeof modelInstance.generateContentStream !== 'function') {
        throw new Error('Failed to initialize generative model stream interface.');
    }

    cachedModel = modelInstance;

    return { model: modelInstance, config };
}
