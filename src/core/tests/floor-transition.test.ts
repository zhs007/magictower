import { describe, it, expect, beforeAll } from 'vitest';
import { GameStateManager } from '../state';
import { handleMove } from '../logic';
import { GameState } from '../types';

describe('Floor Transition Logic', () => {
    let initialState: GameState;

    beforeAll(async () => {
        // Create a state based on floor 1, which has a stair to floor 2
        initialState = await GameStateManager.createInitialState({ floor: 1 });
    });

    it('should set interactionState to "floor_change" when moving onto a stair entity', () => {
        // Find the stair entity from the initial state
        const stairId = 'stair_down_1_to_2';
        const stairEntity = initialState.stairs[stairId];
        expect(stairEntity).toBeDefined();

        // Position the player next to the stairs
        let testState = JSON.parse(JSON.stringify(initialState)); // Deep clone
        testState.player.x = stairEntity.target.x - 1;
        testState.player.y = stairEntity.target.y; // Assuming stair is at x=1, y=1 from floor 2 perspective, which is 14,14 on floor 1

        // Let's use the actual coordinates from the map data
        const stairEntityFromMap = initialState.entities[stairId];
        expect(stairEntityFromMap).toBeDefined();
        testState.player.x = stairEntityFromMap.x - 1;
        testState.player.y = stairEntityFromMap.y;

        // Dispatch a move action to step on the stairs
        const newState = handleMove(testState, 1, 0);

        // Assert the interaction state is correct
        expect(newState.interactionState.type).toBe('floor_change');

        // Type guard for TypeScript
        if (newState.interactionState.type === 'floor_change') {
            expect(newState.interactionState.stairId).toBe(stairId);
        }
    });
});
