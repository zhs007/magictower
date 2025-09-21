declare module 'undici' {
  export class ProxyAgent {
    constructor(proxy: string);
  }

  export function setGlobalDispatcher(dispatcher: unknown): void;
}
