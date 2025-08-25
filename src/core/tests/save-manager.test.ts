import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { GameStateManager } from '../state';
import { SaveManager } from '../save-manager';
import { Action } from '../types';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString();
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
        key: (index: number) => Object.keys(store)[index] || null,
        get length() {
            return Object.keys(store).length;
        },
    };
})();

vi.stubGlobal('localStorage', localStorageMock);

describe('SaveManager', () => {
    let gameStateManager: GameStateManager;
    let saveManager: SaveManager;

    // Load real data once for all tests in this file
    beforeAll(async () => {
        // The GameStateManager now handles loading data, so we just need to initialize it
        gameStateManager = new GameStateManager();
        await gameStateManager.createAndInitializeState(1);
    });

    beforeEach(async () => {
        localStorageMock.clear();
        // Re-initialize state to ensure no pollution between tests
        await gameStateManager.createAndInitializeState(1);
        saveManager = new SaveManager(gameStateManager);
    });

    it('should save and load a game', async () => {
        // Simulate some actions
        const actions: Action[] = [
            { type: 'MOVE', payload: { dx: 1, dy: 0 } },
            { type: 'MOVE', payload: { dx: 0, dy: 1 } },
        ];

        for (const action of actions) {
            gameStateManager.dispatch(action);
        }

        const originalState = { ...gameStateManager.getState() };

        saveManager.saveGame('slot1');
        const loadedState = await SaveManager.loadGame('slot1');

        expect(loadedState).not.toBeNull();
        expect(loadedState!.player.x).toEqual(originalState.player.x);
        expect(loadedState!.player.y).toEqual(originalState.player.y);
        expect(loadedState!.currentFloor).toEqual(originalState.currentFloor);
    });

    it('should list all saved game slot IDs', () => {
        saveManager.saveGame('slot1');
        saveManager.saveGame('slot2');

        const slots = SaveManager.listSaves();
        expect(slots.length).toBe(2);
        expect(slots).toContain('slot1');
        expect(slots).toContain('slot2');
    });

    it('should return null when loading a non-existent slot', async () => {
        const result = await SaveManager.loadGame('non_existent_slot');
        expect(result).toBeNull();
    });

    it('should handle corrupted save data gracefully', async () => {
        localStorage.setItem('save_slot_corrupted', 'this is not json');
        const result = await SaveManager.loadGame('corrupted');
        expect(result).toBeNull();
    });
});
