import { describe, it, expect, beforeEach } from 'vitest';
import { GameState, IPlayer, IMonster, IItem } from '../types';
import { handleMove, handlePickupItem, handleStartBattle, handleAttack, handleEndBattle } from '../logic';

describe('Game Logic with Interactions', () => {
    let gameState: GameState;
    const playerEntityKey = 'player_start_0_0';
    const monsterEntityKey = 'monster_green_slime_2_1';
    const itemEntityKey = 'item_yellow_key_0_1';

    beforeEach(() => {
        const player: IPlayer = { id: 'player', name: 'Hero', hp: 100, attack: 10, defense: 5, x: 1, y: 1, equipment: {}, backupEquipment: [], buffs: [], keys: { yellow: 0, blue: 0, red: 0 } };
        const monster: IMonster = { id: 'monster_green_slime', name: 'Green Slime', hp: 30, attack: 8, defense: 2, x: 2, y: 1, equipment: {}, backupEquipment: [], buffs: [] };
        const item: IItem = { id: 'item_yellow_key', name: 'Yellow Key', type: 'key', color: 'yellow' };

        gameState = {
            currentFloor: 1,
            map: [
                [0, 0, 0],
                [0, 0, 0],
                [0, 0, 0],
            ],
            player,
            entities: {
                [playerEntityKey]: { ...player, type: 'player_start' },
                [itemEntityKey]: { ...item, type: 'item', x: 0, y: 1 },
                [monsterEntityKey]: { ...monster, type: 'monster' },
            },
            monsters: {
                [monsterEntityKey]: monster
            },
            items: {
                [itemEntityKey]: item
            },
            equipments: {},
            doors: {},
            interactionState: { type: 'none' },
        };
    });

    // Test Item Pickup
    describe('handleMove (Item Interaction)', () => {
        it('should set interactionState to "item_pickup" when moving onto an item', () => {
            // Player starts at (2,1) facing right. Item is at (1,1).
            // First move should only turn the player left.
            const turnedState = handleMove(gameState, -1, 0);
            expect(turnedState.player.direction).toBe('left');
            expect(turnedState.interactionState.type).toBe('none');

            // Second move should trigger the interaction.
            const newState = handleMove(turnedState, -1, 0);
            expect(newState.interactionState.type).toBe('item_pickup');
            if (newState.interactionState.type === 'item_pickup') {
                expect(newState.interactionState.itemId).toBe(itemEntityKey);
            }
            expect(newState.player.x).toBe(1);
        });
    });

    describe('handlePickupItem', () => {
        it('should correctly handle picking up an item', () => {
            const stateWithItemInteraction = handleMove(gameState, -1, 0);
            const newState = handlePickupItem(stateWithItemInteraction, itemEntityKey);

            expect(newState.player.x).toBe(0);
            expect(newState.player.y).toBe(1);
            expect(newState.player.keys.yellow).toBe(1);
            expect(newState.entities[itemEntityKey]).toBeUndefined();
            expect(newState.items[itemEntityKey]).toBeUndefined();
            expect(newState.interactionState.type).toBe('none');
        });
    });

    // Test Combat
    describe('handleMove (Combat Interaction)', () => {
        it('should set interactionState to "battle" when moving onto a monster', () => {
            // Player starts at (0,1) facing left. Monster is at (1,1).
            // First move should only turn the player right.
            const turnedState = handleMove(gameState, 1, 0);
            expect(turnedState.player.direction).toBe('right');
            expect(turnedState.interactionState.type).toBe('none');

            // Second move should trigger the battle.
            const newState = handleMove(turnedState, 1, 0);
            expect(newState.interactionState.type).toBe('battle');
            if (newState.interactionState.type === 'battle') {
                expect(newState.interactionState.monsterId).toBe(monsterEntityKey);
            }
            expect(newState.player.x).toBe(1);
        });
    });

    describe('handleStartBattle', () => {
        it('should initialize battle state correctly', () => {
            const newState = handleStartBattle(gameState, monsterEntityKey);
            expect(newState.interactionState.type).toBe('battle');
            if (newState.interactionState.type === 'battle') {
                expect(newState.interactionState.monsterId).toBe(monsterEntityKey);
                expect(newState.interactionState.turn).toBe('player');
                expect(newState.interactionState.playerHp).toBe(100);
                expect(newState.interactionState.monsterHp).toBe(30);
                expect(newState.interactionState.round).toBe(1);
            }
        });
    });

    describe('handleAttack', () => {
        it('should correctly apply damage and switch turns', () => {
            let state = handleStartBattle(gameState, monsterEntityKey);

            state = handleAttack(state, playerEntityKey, monsterEntityKey);
            if (state.interactionState.type === 'battle') {
                expect(state.interactionState.monsterHp).toBe(22);
                expect(state.interactionState.turn).toBe('monster');
            }

            state = handleAttack(state, monsterEntityKey, playerEntityKey);
            if (state.interactionState.type === 'battle') {
                expect(state.interactionState.playerHp).toBe(97);
                expect(state.interactionState.turn).toBe('player');
                expect(state.interactionState.round).toBe(2);
            }
        });
    });

    describe('handleEndBattle', () => {
        it('should correctly end the battle when the player wins', () => {
            let state = handleStartBattle(gameState, monsterEntityKey);
            if (state.interactionState.type === 'battle') {
                state.interactionState.monsterHp = 5;
            }

            state = handleAttack(state, playerEntityKey, monsterEntityKey);

            expect(state.interactionState.type).toBe('battle');
            if (state.interactionState.type === 'battle') {
                expect(state.interactionState.turn).toBe('battle_end');
            }

            const finalState = handleEndBattle(state, playerEntityKey, 'hp_depleted');
            expect(finalState.interactionState.type).toBe('none');
            expect(finalState.monsters[monsterEntityKey]).toBeUndefined();
            expect(finalState.entities[monsterEntityKey]).toBeUndefined();
            expect(finalState.player.hp).toBe(100);
        });

        it('should end the battle on round timeout', () => {
            let state = handleStartBattle(gameState, monsterEntityKey);
            if (state.interactionState.type === 'battle') {
                state.interactionState.round = 9;
            }

            state = handleAttack(state, playerEntityKey, monsterEntityKey);

            expect(state.interactionState.type).toBe('battle');
            if (state.interactionState.type === 'battle') {
                expect(state.interactionState.turn).toBe('battle_end');
            }

            const finalState = handleEndBattle(state, null, 'timeout');
            expect(finalState.interactionState.type).toBe('none');
            expect(finalState.monsters[monsterEntityKey]).toBeDefined();
            expect(finalState.entities[monsterEntityKey]).toBeDefined();
            expect(finalState.player.hp).toBe(100);
        });
    });
});
