import { describe, it, expect, beforeEach } from 'vitest';
import { GameState, IPlayer, IMonster, IItem } from '../types';
import { handleMove, handlePickupItem, handleStartBattle, handleAttack, handleEndBattle } from '../logic';

describe('Game Logic with Interactions', () => {
    let gameState: GameState;

    beforeEach(() => {
        gameState = {
            currentFloor: 1,
            map: [
                [0, 0, 0],
                [0, 0, 0],
                [0, 0, 0],
            ],
            player: { id: 'player', name: 'Hero', hp: 100, attack: 10, defense: 5, x: 1, y: 1, equipment: {}, backupEquipment: [], buffs: [], keys: { yellow: 0, blue: 0, red: 0 } },
            entities: {
                'player_start_0_0': { type: 'player_start', id: 'player', x: 1, y: 1 },
                'item_yellow_key_0_1': { type: 'item', id: 'item_yellow_key', x: 0, y: 1 },
                'monster_green_slime_2_1': { type: 'monster', id: 'monster_green_slime', x: 2, y: 1 },
            },
            monsters: {
                'monster_green_slime_2_1': { id: 'monster_green_slime', name: 'Green Slime', hp: 30, attack: 8, defense: 2, x: 2, y: 1, equipment: {}, backupEquipment: [], buffs: [] }
            },
            items: {
                'item_yellow_key_0_1': { id: 'item_yellow_key', name: 'Yellow Key', type: 'key', color: 'yellow' }
            },
            equipments: {},
            doors: {},
            interactionState: { type: 'none' },
        };
    });

    // Test Item Pickup
    describe('handleMove (Item Interaction)', () => {
        it('should set interactionState to "item_pickup" when moving onto an item', () => {
            const newState = handleMove(gameState, -1, 0); // Move left onto the key
            expect(newState.interactionState.type).toBe('item_pickup');
            if (newState.interactionState.type === 'item_pickup') {
                expect(newState.interactionState.itemId).toBe('item_yellow_key_0_1');
            }
            expect(newState.player.x).toBe(1); // Player should not have moved yet
        });
    });

    describe('handlePickupItem', () => {
        it('should correctly handle picking up an item', () => {
            const stateWithItemInteraction = handleMove(gameState, -1, 0);
            const newState = handlePickupItem(stateWithItemInteraction, 'item_yellow_key_0_1');

            expect(newState.player.x).toBe(0);
            expect(newState.player.y).toBe(1);
            expect(newState.player.keys.yellow).toBe(1);
            expect(newState.entities['item_yellow_key_0_1']).toBeUndefined();
            expect(newState.items['item_yellow_key_0_1']).toBeUndefined();
            expect(newState.interactionState.type).toBe('none');
        });
    });

    // Test Combat
    describe('handleMove (Combat Interaction)', () => {
        it('should set interactionState to "battle" when moving onto a monster', () => {
            const newState = handleMove(gameState, 1, 0); // Move right onto the slime
            expect(newState.interactionState.type).toBe('battle');
            if (newState.interactionState.type === 'battle') {
                expect(newState.interactionState.monsterId).toBe('monster_green_slime_2_1');
            }
            expect(newState.player.x).toBe(1); // Player should not have moved yet
        });
    });

    describe('handleStartBattle', () => {
        it('should initialize battle state correctly', () => {
            const newState = handleStartBattle(gameState, 'monster_green_slime_2_1');
            expect(newState.interactionState.type).toBe('battle');
            if (newState.interactionState.type === 'battle') {
                expect(newState.interactionState.monsterId).toBe('monster_green_slime_2_1');
                expect(newState.interactionState.turn).toBe('player');
                expect(newState.interactionState.playerHp).toBe(100);
                expect(newState.interactionState.monsterHp).toBe(30);
            }
        });
    });

    describe('handleAttack', () => {
        it('should correctly apply damage and switch turns', () => {
            let state = handleStartBattle(gameState, 'monster_green_slime_2_1');

            state = handleAttack(state, 'player', 'monster_green_slime_2_1');
            if (state.interactionState.type === 'battle') {
                expect(state.interactionState.monsterHp).toBe(22);
                expect(state.interactionState.turn).toBe('monster');
            }

            state = handleAttack(state, 'monster_green_slime_2_1', 'player');
            if (state.interactionState.type === 'battle') {
                expect(state.interactionState.playerHp).toBe(97);
                expect(state.interactionState.turn).toBe('player');
            }
        });
    });

    describe('handleEndBattle', () => {
        it('should correctly end the battle when the player wins', () => {
            let state = handleStartBattle(gameState, 'monster_green_slime_2_1');
            if (state.interactionState.type === 'battle') {
                state.interactionState.monsterHp = 5;
            }

            state = handleAttack(state, 'player', 'monster_green_slime_2_1');

            expect(state.interactionState.type).toBe('battle');
            if (state.interactionState.type === 'battle') {
                expect(state.interactionState.turn).toBe('battle_end');
            }

            const finalState = handleEndBattle(state, 'player');
            expect(finalState.interactionState.type).toBe('none');
            expect(finalState.monsters['monster_green_slime_2_1']).toBeUndefined();
            expect(finalState.entities['monster_green_slime_2_1']).toBeUndefined();
            expect(finalState.player.hp).toBe(100);
        });
    });
});
