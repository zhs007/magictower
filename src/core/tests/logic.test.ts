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
            player: { id: 'player', name: 'Hero', hp: 100, attack: 10, defense: 5, x: 1, y: 1, direction: 'right', equipment: {}, backupEquipment: [], buffs: [], keys: { yellow: 0, blue: 0, red: 0 } },
            entities: {
                'player_start_0_0': { type: 'player_start', id: 'player', x: 1, y: 1, direction: 'right' },
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

    it('should make monster turn left to face player', () => {
        // Player is at x=0, monster is at x=1. Player moves right to engage. Monster should turn left.
        gameState.player.x = 0;
        gameState.entities['player_start_0_0'].x = 0;
        const monster = { id: 'm1', name: 'M', hp: 10, attack: 1, defense: 1, x: 1, y: 1, direction: 'right', equipment: {}, backupEquipment: [], buffs: [] };
        gameState.monsters = { 'm1_key': monster };
        gameState.entities['m1_key'] = { ...monster, type: 'monster' };

        const newState = handleMove(gameState, 1, 0); // Player moves right

        expect(newState.interactionState.type).toBe('battle');
        expect(newState.monsters['m1_key'].direction).toBe('left');
    });

    it('should make monster turn right to face player', () => {
        // Player is at x=2, monster is at x=1. Player moves left to engage. Monster should turn right.
        gameState.player.x = 2;
        gameState.entities['player_start_0_0'].x = 2;
        gameState.player.direction = 'left'; // Player must be facing the direction of movement
        gameState.entities['player_start_0_0'].direction = 'left';

        const monster = { id: 'm1', name: 'M', hp: 10, attack: 1, defense: 1, x: 1, y: 1, direction: 'left', equipment: {}, backupEquipment: [], buffs: [] };
        gameState.monsters = { 'm1_key': monster };
        gameState.entities['m1_key'] = { ...monster, type: 'monster' };

        const newState = handleMove(gameState, -1, 0); // Player moves left

        expect(newState.interactionState.type).toBe('battle');
        expect(newState.monsters['m1_key'].direction).toBe('right');
    });

    it('should only turn player on first press in a new direction', () => {
        // Player is at (1,1) facing left.
        gameState.player.direction = 'left';

        // Attempt to move right.
        const newState = handleMove(gameState, 1, 0);

        // Player should not have moved.
        expect(newState.player.x).toBe(1);
        expect(newState.player.y).toBe(1);

        // Player should have turned right.
        expect(newState.player.direction).toBe('right');
    });

    it('should move player on second press in the same direction', () => {
        // Player is at (1,1) facing right.
        gameState.player.direction = 'right';

        // Attempt to move right.
        const newState = handleMove(gameState, 1, 0);

        // Player should have moved.
        expect(newState.player.x).toBe(2);
        expect(newState.player.y).toBe(1);
        expect(newState.player.direction).toBe('right');
    });

    it('should turn, then do nothing when moving into a wall', () => {
        // Player is at (1,1) facing left, wall is at (2,1)
        gameState.map[1][2] = 1;
        gameState.player.direction = 'left';

        // First press: turn right
        const turnedState = handleMove(gameState, 1, 0);
        expect(turnedState.player.direction).toBe('right');
        expect(turnedState.player.x).toBe(1); // Did not move

        // Second press: attempt to move into wall
        const wallState = handleMove(turnedState, 1, 0);
        expect(wallState.player.x).toBe(1); // Still did not move
        expect(wallState.player.direction).toBe('right'); // Direction is unchanged
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
