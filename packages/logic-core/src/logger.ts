// ILogger and simple implementations for Node and Browser environments.
export interface ILogger {
    log(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
}

class PrefixedConsoleLogger implements ILogger {
    private prefix: string;
    constructor(prefix = '[logic-core]') {
        this.prefix = prefix;
    }
    log(...args: unknown[]) {
        console.log(this.prefix, ...args);
    }
    warn(...args: unknown[]) {
        console.warn(this.prefix, ...args);
    }
    error(...args: unknown[]) {
        console.error(this.prefix, ...args);
    }
}

export class NodeLogger extends PrefixedConsoleLogger {}
export class BrowserLogger extends PrefixedConsoleLogger {}

// Global logger instance (can be overridden by consumers)
let _globalLogger: ILogger | null = null;

export function getLogger(): ILogger {
    if (_globalLogger) return _globalLogger;
    const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
    _globalLogger = isBrowser ? new BrowserLogger() : new NodeLogger();
    return _globalLogger;
}

export function setLogger(logger: ILogger): void {
    _globalLogger = logger;
}
