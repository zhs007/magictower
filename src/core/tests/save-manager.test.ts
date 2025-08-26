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
        getPlayerData: vi.fn().mockReturnValue({
            id: 'player',
            name: 'Hero',
            level: 1,
            exp: 0,
            hp: 100,
            keys: { yellow: 0, blue: 0, red: 0 },
        }),
        getLevelData: vi.fn().mockReturnValue([
            { level: 1, exp_needed: 0, maxhp: 100, attack: 10, defense: 10, speed: 10 },
        ]),
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
        vi.mocked(dataManager.getMapLayout).mockReturnValue({
            floor: 1,
            layout: [
                [0, 0, 0],
                [0, 0, 0],
                [0, 0, 0],
            ],
            entities: {
                player_start_1: { type: 'player_start', id: 'player', x: 1, y: 1 },
            },
        });

        gameStateManager = new GameStateManager();
        await gameStateManager.createAndInitializeState(1);
        // saveManager is used for saving, which is still an instance method
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

        // Save the game using an instance
        saveManager.saveGame('slot1');

        // Load the game using the static method
        const loadedState = await SaveManager.loadGame('slot1');

        expect(loadedState).not.toBeNull();

        // Compare states
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
