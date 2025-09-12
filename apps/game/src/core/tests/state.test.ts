import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager } from '../state';
import {
    GameState,
    IEquipment,
    EquipmentSlot,
    dataManager,
    MapLayout,
} from '@proj-tower/logic-core';

// Mock the dataManager from the logic-core package
vi.mock('@proj-tower/logic-core', async (importOriginal) => {
    const original = await importOriginal<typeof import('@proj-tower/logic-core')>();
    return {
        ...original,
        dataManager: {
            loadAllData: vi.fn().mockResolvedValue(undefined),
            getMapLayout: vi.fn(),
            getMonsterData: vi.fn(),
            getItemData: vi.fn(),
            getEquipmentData: vi.fn(),
            getPlayerData: vi.fn().mockReturnValue({
                id: 'player',
                name: 'Hero',
                level: 1,
                exp: 0,
                hp: 100,
                maxhp: 100,
                attack: 10,
                defense: 10,
                speed: 10,
                x: 0,
                y: 0,
                direction: 'right' as const,
                equipment: {},
                backupEquipment: [],
                buffs: [],
                keys: { yellow: 0, blue: 0, red: 0 },
            }),
            getLevelData: vi
                .fn()
                .mockReturnValue([
                    { level: 1, exp_needed: 0, maxhp: 100, attack: 10, defense: 10, speed: 10 },
                ]),
        },
    };
});

describe('GameStateManager', () => {
    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();
    });

    describe('createInitialState', () => {
        it('should create a valid initial game state from map data', async () => {
            // Arrange
            const mockMapData: MapLayout = {
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
            const mockMonsterData = {
                id: 'monster_green_slime',
                name: 'Green Slime',
                level: 1,
                hp: 20,
                maxhp: 20,
                attack: 5,
                defense: 2,
                speed: 3,
                x: 0,
                y: 0,
                direction: 'left' as const,
                equipment: {},
                backupEquipment: [],
                buffs: [],
                gold: 5,
            };

            vi.mocked(dataManager.getMapLayout).mockReturnValue(mockMapData);
            vi.mocked(dataManager.getMonsterData).mockReturnValue(mockMonsterData);

            // Act
            const gameState = await GameStateManager.createInitialState({ floor: 1 });

            // Assert
            expect(gameState).toBeDefined();
            expect(gameState.currentFloor).toBe(1);
            expect(gameState.map).toEqual([
                [1, 1, 1],
                [1, 0, 1],
                [1, 1, 1],
            ]);
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
            await expect(GameStateManager.createInitialState({ floor: 1 })).rejects.toThrow(
                'Player could not be created or placed.'
            );
        });

        it('should correctly load equipment from map data', async () => {
            // Arrange
            const mockMapData: MapLayout = {
                floor: 1,
                layout: [
                    [1, 1, 1],
                    [1, 0, 1],
                    [1, 1, 1],
                ],
                entities: {
                    player_start: { type: 'player_start', id: 'player', x: 1, y: 1 },
                    sword_1: { type: 'equipment', id: 'iron_sword', x: 2, y: 1 },
                },
            };
            const mockEquipmentData: IEquipment = {
                id: 'iron_sword',
                name: 'Iron Sword',
                slot: EquipmentSlot.RIGHT_HAND,
            };

            vi.mocked(dataManager.getMapLayout).mockReturnValue(mockMapData);
            vi.mocked(dataManager.getEquipmentData).mockReturnValue(mockEquipmentData);

            // Act
            const gameState = await GameStateManager.createInitialState({ floor: 1 });

            // Assert
            expect(gameState.equipments).toBeDefined();
            expect(Object.keys(gameState.equipments).length).toBe(1);
            expect(gameState.equipments['sword_1']).toBeDefined();
            expect(gameState.equipments['sword_1'].id).toBe('iron_sword');
            expect(gameState.equipments['sword_1'].name).toBe('Iron Sword');
            expect((gameState.equipments['sword_1'] as any).x).toBe(2);
            expect((gameState.equipments['sword_1'] as any).y).toBe(1);
            expect(gameState.entities['sword_1']).toBeDefined();
        });
    });
});
