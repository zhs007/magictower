import * as GenAI from '@google/genai';
import { loadGeminiConfig } from './config';
import { configureProxyFromEnv } from './proxy';
import { appendMessage } from './conversation-store';
import { tools, toolFunctions } from './tools';

let cachedClient: any | null = null;
let cachedCfg: Awaited<ReturnType<typeof loadGeminiConfig>> | null = null;
type AgentSession = {
    id: string;
    inFlight: boolean;
    createdAt: number;
    updatedAt: number;
    chat?: any;
};
const sessions = new Map<string, AgentSession>();

function getOrCreateSession(id: string): AgentSession {
    const existing = sessions.get(id);
    if (existing) return existing;
    const now = Date.now();
    const s: AgentSession = { id, inFlight: false, createdAt: now, updatedAt: now };
    sessions.set(id, s);
    return s;
}

async function ensureClient(): Promise<{ client: any; model: string; systemInstruction: string; }> {
    const cfg = cachedCfg ?? (cachedCfg = await loadGeminiConfig());
    if (cachedClient) {
        return { client: cachedClient, model: cfg.model, systemInstruction: cfg.systemInstruction };
    }
    configureProxyFromEnv();
    const client = new (GenAI as any).GoogleGenAI({ apiKey: cfg.apiKey });
    cachedClient = client;
    try {
        // eslint-disable-next-line no-console
        console.info('[gemini] created new client', {
            hasSystemInstruction: Boolean(cfg.systemInstruction),
            model: cfg.model,
        });
    } catch (_) {}
    return { client, model: cfg.model, systemInstruction: cfg.systemInstruction };
}

// Build a CallableTool so Chat can handle function-calling for us
const callableTool: any = {
    async tool() {
        // Our tools export is an array; return the single declaration group
        return tools[0];
    },
    async callTool(functionCalls: any[]): Promise<any[]> {
        const outParts: any[] = [];
        for (const fc of functionCalls) {
            const name = fc?.name as string;
            const args = (fc?.args ?? {}) as Record<string, unknown>;
            let result: unknown;
            try {
                switch (name) {
                    case 'getAllMonsters':
                        result = await toolFunctions.getAllMonsters();
                        break;
                    case 'getMonstersInfo':
                        result = await toolFunctions.getMonstersInfo(args.level as number);
                        break;
                    case 'updMonsterInfo':
                        result = await toolFunctions.updMonsterInfo(args.monsterData as any);
                        break;
                    case 'simBattle':
                        result = await toolFunctions.simBattle(args.monsterId as string, args.playerLevel as number);
                        break;
                    case 'genDoubaoImage':
                        result = await toolFunctions.genDoubaoImage(args.prompt as string);
                        break;
                    case 'saveMonsterImage':
                        result = await toolFunctions.saveMonsterImage(args.assetId as string, args.imageUrl as string);
                        break;
                    default:
                        result = `Error: Tool "${name}" not found.`;
                        break;
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                result = `Error while executing ${name}: ${msg}`;
            }

        // Normalize tool output so that functionResponse.response is ALWAYS an object
        // (the API expects a Struct-like map; arrays/primitive values can trigger INVALID_ARGUMENT)
        let responsePayload: Record<string, unknown>;
            if (typeof result === 'string') {
                try {
                    const parsed = JSON.parse(result);
                    if (Array.isArray(parsed)) {
                        responsePayload = { data: parsed };
                    } else if (parsed && typeof parsed === 'object') {
                        responsePayload = parsed as Record<string, unknown>;
                    } else {
                        responsePayload = { value: parsed };
                    }
                } catch {
                    responsePayload = { text: result };
                }
            } else if (Array.isArray(result)) {
                responsePayload = { data: result } as unknown as Record<string, unknown>;
            } else if (result && typeof result === 'object') {
                responsePayload = result as Record<string, unknown>;
            } else {
                responsePayload = { value: result as unknown } as Record<string, unknown>;
            }
            const id = (fc as any).id || `${name}-${Date.now()}`;
            const part = (GenAI as any).createPartFromFunctionResponse(id, name, responsePayload);
            outParts.push(part);
        }
        return outParts;
    },
};

function getOrCreateChat(sessionId: string, model: string, systemInstruction: string, client: any) {
    const s = getOrCreateSession(sessionId);
    if (s.chat) return s.chat;
    const chat = (client as any).chats.create({
        model,
        config: {
            systemInstruction,
            tools: [callableTool],
            responseMimeType: 'text/plain',
        },
    });
    s.chat = chat;
    return chat;
}

// Public, simplified turn runner using Chat API with tool calling handled by the SDK.
export async function runAgentTurn(conversationId: string, message: string, opts?: { generationConfig?: any; safetySettings?: any; }): Promise<{ text: string; assistantMessageId: string; }> {
    const session = getOrCreateSession(conversationId);
    if (session.inFlight) {
        throw new Error('Agent session is busy handling another turn for this conversation.');
    }
    session.inFlight = true;
    session.updatedAt = Date.now();
    try {
        const { client, model, systemInstruction } = await ensureClient();
        const chat = getOrCreateChat(conversationId, model, systemInstruction, client);

        // Record user message in our store for UI history
        appendMessage(conversationId, 'user', message);

        const stream = await (chat as any).sendMessageStream({
            message,
            // Optionally pass tuning: generationConfig / safetySettings
            ...(opts?.generationConfig ? { generationConfig: opts.generationConfig } : {}),
            ...(opts?.safetySettings ? { safetySettings: opts.safetySettings } : {}),
        });

        let aggregated = '';
        // for await (const chunk of stream) { aggregated += chunk.text ?? ''; }
        // Some SDK builds return an async generator directly; normalize via for-await
        for await (const chunk of stream as AsyncGenerator<any>) {
            const t = (chunk as any)?.text ?? '';
            if (t) aggregated += t;
        }

        const finalText = aggregated || '（模型没有返回内容）';
        const assistantMsg = appendMessage(conversationId, 'assistant', finalText);
        return { text: finalText, assistantMessageId: assistantMsg.id };
    } finally {
        session.inFlight = false;
        session.updatedAt = Date.now();
    }
}

// Streaming variant: emits chunks via onChunk while aggregating final text.
export async function runAgentTurnStream(
    conversationId: string,
    message: string,
    onChunk: (text: string) => void | Promise<void>,
    opts?: { generationConfig?: any; safetySettings?: any }
): Promise<{ text: string; assistantMessageId: string }> {
    const session = getOrCreateSession(conversationId);
    if (session.inFlight) {
        throw new Error('Agent session is busy handling another turn for this conversation.');
    }
    session.inFlight = true;
    session.updatedAt = Date.now();
    try {
        const { client, model, systemInstruction } = await ensureClient();
        const chat = getOrCreateChat(conversationId, model, systemInstruction, client);

        // Record user message for UI/history
        appendMessage(conversationId, 'user', message);

        const stream = await (chat as any).sendMessageStream({
            message,
            ...(opts?.generationConfig ? { generationConfig: opts.generationConfig } : {}),
            ...(opts?.safetySettings ? { safetySettings: opts.safetySettings } : {}),
        });

        let aggregated = '';
        for await (const chunk of stream as AsyncGenerator<any>) {
            const t = (chunk as any)?.text ?? '';
            if (t) {
                aggregated += t;
                try {
                    await onChunk(t);
                } catch (_) {
                    // Swallow callback errors to keep streaming
                }
            }
        }

        const finalText = aggregated || '（模型没有返回内容）';
        const assistantMsg = appendMessage(conversationId, 'assistant', finalText);
        return { text: finalText, assistantMessageId: assistantMsg.id };
    } finally {
        session.inFlight = false;
        session.updatedAt = Date.now();
    }
}
