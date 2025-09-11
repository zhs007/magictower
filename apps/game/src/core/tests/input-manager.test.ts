import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InputManager } from '../input-manager';
import { Action } from '../types';

// JSDOM does not have a native KeyboardEvent, so we need a minimal mock.
class MockKeyboardEvent extends Event {
    key: string;
    constructor(type: string, { key }: { key: string }) {
        super(type);
        this.key = key;
    }
}
global.KeyboardEvent = MockKeyboardEvent as any;

describe('InputManager', () => {
    let inputManager: InputManager;
    const actionCallback = vi.fn();

    // Mock window.addEventListener
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();

        // We create the InputManager here to ensure the spy is active
        // when the constructor calls addEventListener.
        inputManager = new InputManager();
        inputManager.on('action', actionCallback);
    });

    afterEach(() => {
        inputManager.destroy();
    });

    it('should add a keydown event listener on initialization', () => {
        expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should remove the keydown event listener on destroy', () => {
        inputManager.destroy();
        expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    const testCases: { key: string; expectedAction: Action }[] = [
        { key: 'ArrowUp', expectedAction: { type: 'MOVE', payload: { dx: 0, dy: -1 } } },
        { key: 'w', expectedAction: { type: 'MOVE', payload: { dx: 0, dy: -1 } } },
        { key: 'W', expectedAction: { type: 'MOVE', payload: { dx: 0, dy: -1 } } },
        { key: 'ArrowDown', expectedAction: { type: 'MOVE', payload: { dx: 0, dy: 1 } } },
        { key: 's', expectedAction: { type: 'MOVE', payload: { dx: 0, dy: 1 } } },
        { key: 'S', expectedAction: { type: 'MOVE', payload: { dx: 0, dy: 1 } } },
        { key: 'ArrowLeft', expectedAction: { type: 'MOVE', payload: { dx: -1, dy: 0 } } },
        { key: 'a', expectedAction: { type: 'MOVE', payload: { dx: -1, dy: 0 } } },
        { key: 'A', expectedAction: { type: 'MOVE', payload: { dx: -1, dy: 0 } } },
        { key: 'ArrowRight', expectedAction: { type: 'MOVE', payload: { dx: 1, dy: 0 } } },
        { key: 'd', expectedAction: { type: 'MOVE', payload: { dx: 1, dy: 0 } } },
        { key: 'D', expectedAction: { type: 'MOVE', payload: { dx: 1, dy: 0 } } },
    ];

    testCases.forEach(({ key, expectedAction }) => {
        it(`should emit a MOVE action for the "${key}" key`, () => {
            // Simulate a keydown event
            const event = new KeyboardEvent('keydown', { key });
            // Get the handler from the spy
            const handler = addEventListenerSpy.mock.calls[0][1] as (evt: Event) => void;
            handler(event);

            expect(actionCallback).toHaveBeenCalledWith(expectedAction);
        });
    });

    it('should not emit an action for an unmapped key', () => {
        const event = new KeyboardEvent('keydown', { key: 'Shift' });
        const handler = addEventListenerSpy.mock.calls[0][1] as (evt: Event) => void;
        handler(event);

        expect(actionCallback).not.toHaveBeenCalled();
    });
});
