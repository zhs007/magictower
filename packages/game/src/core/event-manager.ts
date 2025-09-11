type EventCallback = (payload?: any) => void;

class EventManager {
    private static instance: EventManager;
    private listeners: Record<string, EventCallback[]> = {};

    private constructor() {}

    public static getInstance(): EventManager {
        if (!EventManager.instance) {
            EventManager.instance = new EventManager();
        }
        return EventManager.instance;
    }

    public on(eventName: string, callback: EventCallback): void {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(callback);
    }

    public off(eventName: string, callback: EventCallback): void {
        if (!this.listeners[eventName]) {
            return;
        }
        this.listeners[eventName] = this.listeners[eventName].filter(
            (listener) => listener !== callback
        );
    }

    public dispatch(eventName: string, payload?: any): void {
        if (!this.listeners[eventName]) {
            return;
        }
        this.listeners[eventName].forEach((callback) => {
            try {
                callback(payload);
            } catch (error) {
                console.error(`Error in event listener for ${eventName}:`, error);
            }
        });
    }
}

export const eventManager = EventManager.getInstance();
