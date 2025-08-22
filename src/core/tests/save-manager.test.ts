import { vi, describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager } from '../state';
import { SaveManager } from '../save-manager';
import { Action, GameState } from '../types';
import { dataManager } from '../../data/data-manager';

// Mock the entire data-manager
vi.mock('../../data/data-manager', () => ({
    dataManager: {
        loadAllData: vi.fn().mockResolvedValue(undefined),
        getMapLayout: vi.fn(),
        getMonsterData: vi.fn(),
        getItemData: vi.fn(),
    },
}));

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

    beforeEach(async () => {
        localStorageMock.clear();

        // Provide mock data for floor 1
        (dataManager.getMapLayout as vi.Mock).mockReturnValue({
            layout: [
                [0, 0, 0],
                [0, 0, 0],
                [0, 0, 0],
            ],
            entities: {
                'player_start_1': { type: 'player_start', x: 1, y: 1 },
            },
        });

        gameStateManager = new GameStateManager();
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

        // Save the game
        saveManager.saveGame('slot1');

        // Create a new game state manager to load into
        const newGameStateManager = new GameStateManager();
        const newSaveManager = new SaveManager(newGameStateManager);
        await newSaveManager.loadGame('slot1');

        const loadedState = newGameStateManager.getState();

        // Compare states
        expect(loadedState.player.x).toEqual(originalState.player.x);
        expect(loadedState.player.y).toEqual(originalState.player.y);
        expect(loadedState.currentFloor).toEqual(originalState.currentFloor);
        expect(newGameStateManager.actionHistory).toEqual(gameStateManager.actionHistory);
    });

    it('should list all saved games', () => {
        saveManager.saveGame('slot1');
        saveManager.saveGame('slot2');

        const saves = saveManager.listSaves();
        expect(saves.length).toBe(2);
        expect(saves.map(s => s.actions.length)).toContain(0);
    });

    it('should return null when loading a non-existent slot', async () => {
        const result = await saveManager.loadGame('non_existent_slot');
        expect(result).toBeNull();
    });

    it('should handle corrupted save data gracefully', async () => {
        localStorage.setItem('save_slot_corrupted', 'this is not json');
        const result = await saveManager.loadGame('corrupted');
        expect(result).toBeNull();
    });
});
