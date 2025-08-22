import { describe, it, expect, beforeEach } from 'vitest';
import { handleMove, handleOpenDoor } from '../logic';
import { GameState } from '../types';

describe('handleMove', () => {
    let gameState: GameState;

    beforeEach(() => {
        gameState = {
            currentFloor: 1,
            map: [
                [0, 0, 1],
                [0, 0, 0],
                [1, 0, 0],
            ],
            player: { id: 'player', name: 'Hero', hp: 100, attack: 10, defense: 5, x: 1, y: 1, equipment: {}, backupEquipment: [], buffs: [], keys: { yellow: 0, blue: 0, red: 0 } },
            entities: {
                'player_start_0_0': { type: 'player_start', id: 'player', x: 1, y: 1 },
            },
            monsters: {},
            items: {},
            equipments: {},
            doors: {},
            interactionState: { type: 'none' },
        };
    });

    it('should allow player to move to an empty tile', () => {
        const newState = handleMove(gameState, 0, -1); // Move up
        expect(newState.player.x).toBe(1);
        expect(newState.player.y).toBe(0);
        expect(newState.entities['player_start_0_0'].y).toBe(0);
    });

    it('should not allow player to move out of bounds', () => {
        const newState = handleMove(gameState, 0, -2); // Move up out of bounds
        expect(newState.player.x).toBe(1);
        expect(newState.player.y).toBe(1);
    });

    it('should not allow player to move into a wall', () => {
        const newState = handleMove(gameState, 1, 0); // Move right to (2,1)
        const wallState = handleMove(newState, 0, -1); // Move up to a wall at (2,0)
        expect(wallState.player.x).toBe(2);
        expect(wallState.player.y).toBe(1);
    });
});

describe('handleOpenDoor', () => {
    it('should allow player to open a door', () => {
        const gameState: GameState = {
            currentFloor: 1,
            map: [
                [0],
            ],
            player: { id: 'player', name: 'Hero', hp: 100, attack: 10, defense: 5, x: 0, y: 0, equipment: {}, backupEquipment: [], buffs: [], keys: { yellow: 0, blue: 0, red: 0 } },
            entities: {
                'door1': { type: 'door', id: 'door1', x: 0, y: 0 }
            },
            monsters: {},
            items: {},
            equipments: {},
            doors: { 'door1': { id: 'door1', color: 'yellow' } },
            interactionState: { type: 'none' },
        };

        const newState = handleOpenDoor(gameState, 'door1');
        expect(newState.doors['door1']).toBeUndefined();
    });
});
