import { loadGeminiConfig } from './config';
import { configureProxyFromEnv } from './proxy';

interface GenerativeModelLike {
  generateContentStream: (
    request: {
      contents: Array<{ role: string; parts: Array<{ text: string }> }>;
    },
  ) => Promise<{
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

  const genaiModule: Record<string, any> = await import('@google/genai');
  const GoogleAI =
    genaiModule.GoogleAI ||
    genaiModule.GoogleAIClient ||
    genaiModule.GoogleGenerativeAI ||
    genaiModule.GoogleGenAI ||
    genaiModule.GoogleGenAIClient;

  if (!GoogleAI) {
    throw new Error('Failed to load google/genai client. Ensure @google/genai is installed.');
  }

  const client = new GoogleAI({ apiKey: config.apiKey });

  const systemInstruction = config.systemInstruction
    ? { role: 'system', parts: [{ text: config.systemInstruction }] }
    : undefined;

  // Newer @google/genai exposes generation methods under client.models
  if (client.models && typeof client.models.generateContentStream === 'function') {
    const modelInstance: GenerativeModelLike = {
      generateContentStream: (request: { contents: any[] }) =>
        // delegate directly to the client's models API
        client.models.generateContentStream({ ...request, model: config.model, ...(systemInstruction ? { systemInstruction } : {}) }),
    };

    cachedModel = modelInstance;
    return { model: modelInstance, config };
  }

  const getModelFn =
    client.getGenerativeModel?.bind(client) ||
    client.generativeModel?.bind(client) ||
    client.model?.bind(client);

  if (!getModelFn) {
    throw new Error('google/genai client does not expose a getGenerativeModel method.');
  }

  const modelInstance: GenerativeModelLike = getModelFn({
    model: config.model,
    ...(systemInstruction ? { systemInstruction } : {}),
  });

  if (
    !modelInstance ||
    typeof modelInstance.generateContentStream !== 'function'
  ) {
    throw new Error('Failed to initialize generative model stream interface.');
  }

  cachedModel = modelInstance;

  return { model: modelInstance, config };
}
