declare module 'dotenv' {
    interface DotenvConfigOptions {
        path?: string;
        override?: boolean;
    }

    interface DotenvConfigOutput {
        error?: Error;
        parsed?: Record<string, string>;
    }

    export function config(options?: DotenvConfigOptions): DotenvConfigOutput;
}
