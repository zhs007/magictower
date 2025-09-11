import { Action } from '@proj-tower/logic-core';

type ActionCallback = (action: Action) => void;

/**
 * Manages player input, converting raw keyboard events into game-specific actions.
 */
export class InputManager {
    private listeners: Record<string, ActionCallback[]> = {};

    constructor() {
        this.initialize();
    }

    /**
     * Sets up the keyboard event listeners.
     */
    private initialize(): void {
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    /**
     * Subscribes to a specific event.
     * @param event - The event to subscribe to (e.g., 'action').
     * @param callback - The function to call when the event is emitted.
     */
    public on(event: string, callback: ActionCallback): void {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    /**
     * Emits an event to all its subscribers.
     * @param event - The event to emit.
     * @param data - The data to pass to the subscribers.
     */
    private emit(event: string, data: Action): void {
        const eventListeners = this.listeners[event];
        if (eventListeners) {
            eventListeners.forEach((callback) => callback(data));
        }
    }

    /**
     * Handles the keydown event and translates it into a game action.
     * @param event - The keyboard event.
     */
    private handleKeyDown(event: KeyboardEvent): void {
        let action: Action | null = null;

        switch (event.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                action = { type: 'MOVE', payload: { dx: 0, dy: -1 } };
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                action = { type: 'MOVE', payload: { dx: 0, dy: 1 } };
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                action = { type: 'MOVE', payload: { dx: -1, dy: 0 } };
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                action = { type: 'MOVE', payload: { dx: 1, dy: 0 } };
                break;
            case 'p':
            case 'P':
                action = { type: 'USE_POTION' };
                break;
        }

        if (action) {
            this.emit('action', action);
        }
    }

    /**
     * Cleans up event listeners.
     */
    public destroy(): void {
        window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    }
}
