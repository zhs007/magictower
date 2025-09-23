import * as GenAI from '@google/genai';
import { loadGeminiConfig } from './config';
import { configureProxyFromEnv } from './proxy';

type GoogleGenAIClass = new (opts: any) => any;
const GoogleGenAICtor = (GenAI as any).GoogleGenAI as GoogleGenAIClass;

let cachedClients: Map<string, any> = new Map();

export interface GeminiClientWithConfig {
    client: any;
    config: Awaited<ReturnType<typeof loadGeminiConfig>>;
}

export async function getGeminiModel(tools?: any[]): Promise<GeminiClientWithConfig> {
    const config = await loadGeminiConfig();
    const cacheKey = tools ? JSON.stringify(tools) : 'no-tools';

    if (cachedClients.has(cacheKey)) {
        try {
            // eslint-disable-next-line no-console
            console.debug('[gemini] using cached client', {
                toolsCount: tools?.[0]?.functionDeclarations?.length ?? 0,
                model: config.model,
            });
        } catch (_) {}
        return { client: cachedClients.get(cacheKey)!, config };
    }

    configureProxyFromEnv();

    const client = new GoogleGenAICtor({ apiKey: config.apiKey });

    cachedClients.set(cacheKey, client);

    try {
        // eslint-disable-next-line no-console
        console.info('[gemini] created new client', {
            toolsCount: tools?.[0]?.functionDeclarations?.length ?? 0,
            hasSystemInstruction: Boolean(config.systemInstruction),
            model: config.model,
        });
    } catch (_) {}

    return { client, config };
}

// Small helper to call the right surface across SDK versions and always inject systemInstruction
export async function generateContentWithSystem({
    client,
    request,
}: {
    client: any;
    request: {
        model: string;
        contents: any[];
        tools?: any[];
        toolConfig?: any;
        generationConfig?: any;
        systemInstruction?: string | { role: string; parts: Array<{ text?: string }>; };
    };
}): Promise<any> {
    // Prefer the new Responses API if present
    const sys = request.systemInstruction;
    const hasResponses = (client as any)?.responses?.generate;
    if (hasResponses) {
        return (client as any).responses.generate({
            model: request.model,
            // Some SDK builds call this `contents`, others use `input`.
            contents: request.contents,
            input: request.contents,
            tools: request.tools,
            toolConfig: request.toolConfig,
            systemInstruction: sys,
            // Some SDK builds use `config`, others `generationConfig`.
            config: request.generationConfig,
            generationConfig: request.generationConfig,
        });
    }
    // Fallback to legacy models surface
    const hasModelsGenerate = (client as any)?.models?.generateContent;
    if (hasModelsGenerate) {
        return (client as any).models.generateContent({
            model: request.model,
            contents: request.contents,
            tools: request.tools,
            toolConfig: request.toolConfig,
            systemInstruction: sys,
            generationConfig: request.generationConfig,
        });
    }
    throw new Error('[gemini] No compatible generation surface found on @google/genai client');
}
