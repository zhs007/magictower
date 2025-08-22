import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager } from '../state';
import { dataManager } from '../../data/data-manager';
import { GameState } from '../types';

// Mock the dataManager
vi.mock('../../data/data-manager', () => ({
    dataManager: {
        loadAllData: vi.fn().mockResolvedValue(undefined),
        getMapLayout: vi.fn(),
        getMonsterData: vi.fn(),
        getItemData: vi.fn(),
    },
}));

describe('GameStateManager', () => {
    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();
    });

    describe('createInitialState', () => {
        it('should create a valid initial game state from map data', async () => {
            // Arrange
            const mockMapData = {
                floor: 1,
                layout: [
                    [1, 1, 1],
                    [1, 0, 1],
                    [1, 1, 1],
                ],
                entities: {
                    player_start: { type: 'player_start', id: 'player', x: 1, y: 1 },
                    monster_1: { type: 'monster', id: 'monster_green_slime', x: 1, y: 2 },
                },
            };
            const mockMonsterData = { id: 'monster_green_slime', name: 'Green Slime', hp: 20, attack: 5, defense: 2 };

            vi.mocked(dataManager.getMapLayout).mockReturnValue(mockMapData);
            vi.mocked(dataManager.getMonsterData).mockReturnValue(mockMonsterData);

            // Act
            const gameState = await GameStateManager.createInitialState(1);

            // Assert
            expect(gameState).toBeDefined();
            expect(gameState.currentFloor).toBe(1);
            expect(gameState.map).toEqual([[1, 1, 1], [1, 0, 1], [1, 1, 1]]);
            expect(gameState.player).toBeDefined();
            expect(gameState.player.x).toBe(1);
            expect(gameState.player.y).toBe(1);
            expect(Object.keys(gameState.entities).length).toBe(2);
            expect(gameState.entities['player_start']).toBeDefined();
            expect(gameState.entities['monster_1']).toBeDefined();
            expect(gameState.monsters['monster_1']).toBeDefined();
            expect(gameState.monsters['monster_1'].name).toBe('Green Slime');
        });

        it('should throw an error if player start is not found', async () => {
             // Arrange
             const mockMapData = {
                floor: 1,
                layout: [[0]],
                entities: {},
            };
            vi.mocked(dataManager.getMapLayout).mockReturnValue(mockMapData);

            // Act & Assert
            await expect(GameStateManager.createInitialState(1)).rejects.toThrow(
                'Player start position not found in map data.'
            );
        });
    });
});
