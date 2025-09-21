declare module '@google/genai' {
    interface ContentPart {
        text: string;
    }

    interface Content {
        role: string;
        parts: ContentPart[];
    }

    interface GenerateContentStreamResult {
        stream: AsyncIterable<any>;
        response: Promise<any>;
    }

    interface GenerativeModelOptions {
        model: string;
        systemInstruction?: string | { role: string; parts: ContentPart[] };
    }

    interface GenerateContentStreamRequest {
        contents: Content[];
    }

    interface GenerativeModel {
        generateContentStream(
            request: GenerateContentStreamRequest
        ): Promise<GenerateContentStreamResult>;
    }

    interface GoogleAIOptions {
        apiKey: string;
    }

    export class GoogleAI {
        constructor(options: GoogleAIOptions);
        getGenerativeModel(options: GenerativeModelOptions): GenerativeModel;
        generativeModel?(options: GenerativeModelOptions): GenerativeModel;
    }

    export class GoogleAIClient extends GoogleAI {}
    export class GoogleGenerativeAI extends GoogleAI {}
}
