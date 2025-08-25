import { describe, it, expect, beforeAll } from 'vitest';
import { GameStateManager } from '../state';

describe('GameStateManager', () => {
    describe('createInitialState', () => {
        it.skip('should create a valid initial game state from real floor 1 data', async () => {
            // Act
            const gameState = await GameStateManager.createInitialState(1);

            // Assert
            expect(gameState).toBeDefined();
            expect(gameState.currentFloor).toBe(1);
            expect(gameState.player).toBeDefined();
            expect(gameState.player.x).toBe(2); // As per floor_01.json
            expect(gameState.player.y).toBe(2); // As per floor_01.json
            expect(gameState.player.hp).toBe(150);
            expect(Object.keys(gameState.entities).length).toBeGreaterThan(1); // Player, monster, item
            expect(gameState.entities['player_start']).toBeDefined();
        });

        it.skip('should throw an error if a map for the floor does not exist', async () => {
            // Act & Assert
            // Using a floor number that is unlikely to exist
            await expect(GameStateManager.createInitialState(999)).rejects.toThrow(
                'Map for floor 999 not found.'
            );
        });
    });
});
