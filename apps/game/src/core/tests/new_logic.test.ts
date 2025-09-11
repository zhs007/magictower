import { describe, it, expect, beforeEach } from 'vitest';
import {
    GameState,
    IPlayer,
    IMonster,
    IItem,
    handleMove,
    handlePickupItem,
    handleStartBattle,
    handleAttack,
    handleEndBattle,
} from '@proj-tower/logic-core';

describe('Game Logic with Interactions', () => {
    let gameState: GameState;
    const playerEntityKey = 'player_start_0_0';
    const monsterEntityKey = 'monster_green_slime_2_1';
    const itemEntityKey = 'item_yellow_key_0_1';

    beforeEach(() => {
        const player: IPlayer = {
            id: 'player',
            name: 'Hero',
            level: 1,
            exp: 0,
            hp: 100,
            maxhp: 100,
            attack: 10,
            defense: 5,
            speed: 10,
            x: 1,
            y: 1,
            direction: 'right',
            equipment: {},
            backupEquipment: [],
            buffs: [],
            keys: { yellow: 0, blue: 0, red: 0 },
        };
        const monster: IMonster = {
            id: 'monster_green_slime',
            name: 'Green Slime',
            level: 1,
            hp: 30,
            maxhp: 30,
            attack: 8,
            defense: 2,
            speed: 5,
            x: 2,
            y: 1,
            direction: 'left',
            equipment: {},
            backupEquipment: [],
            buffs: [],
        };
        const item: IItem = {
            id: 'item_yellow_key',
            name: 'Yellow Key',
            type: 'key',
            color: 'yellow',
        };

        gameState = {
            currentFloor: 1,
            map: [
                [0, 0, 0],
                [0, 1, 0],
                [0, 0, 0],
            ],
            player,
            entities: {
                [playerEntityKey]: { ...player, type: 'player_start' },
                [itemEntityKey]: { ...item, type: 'item', x: 0, y: 1 },
                [monsterEntityKey]: { ...monster, type: 'monster' },
            },
            monsters: {
                [monsterEntityKey]: monster,
            },
            items: {
                [itemEntityKey]: item,
            },
            equipments: {},
            doors: {},
            stairs: {},
            interactionState: { type: 'none' },
        };
    });

    describe('handleMove (Item Interaction)', () => {
        it('should set interactionState to "item_pickup" when moving onto an item', () => {
            gameState.player.x = 1;
            gameState.player.y = 1;
            gameState.player.direction = 'left';

            const newState = handleMove(gameState, -1, 0);

            expect(newState.interactionState.type).toBe('item_pickup');
            if (newState.interactionState.type === 'item_pickup') {
                expect(newState.interactionState.itemId).toBe(itemEntityKey);
            }
            // Player should not have moved, as an interaction was triggered
            expect(newState.player.x).toBe(1);
        });
    });

    describe('handlePickupItem', () => {
        it('should correctly handle picking up an item', () => {
            const stateWithItemInteraction = {
                ...gameState,
                interactionState: { type: 'item_pickup', itemId: itemEntityKey },
            } as GameState;

            const entity = stateWithItemInteraction.entities[itemEntityKey];
            stateWithItemInteraction.player.x = entity.x;
            stateWithItemInteraction.player.y = entity.y;

            const newState = handlePickupItem(stateWithItemInteraction, itemEntityKey);

            expect(newState.player.keys.yellow).toBe(1);
            expect(newState.entities[itemEntityKey]).toBeUndefined();
            expect(newState.items[itemEntityKey]).toBeUndefined();
            expect(newState.interactionState.type).toBe('none');
        });
    });

    describe('handleMove (Combat Interaction)', () => {
        it('should set interactionState to "battle" when moving onto a monster', () => {
            const newState = handleMove(gameState, 1, 0);
            expect(newState.interactionState.type).toBe('battle');
            if (newState.interactionState.type === 'battle') {
                expect(newState.interactionState.monsterId).toBe(monsterEntityKey);
            }
        });
    });

    describe('handleStartBattle', () => {
        it('should give player first turn if faster', () => {
            const newState = handleStartBattle(gameState, monsterEntityKey);
            expect(newState.interactionState.type).toBe('battle');
            if (newState.interactionState.type === 'battle') {
                expect(newState.interactionState.turn).toBe('player');
            }
        });

        it('should give monster first turn if faster', () => {
            gameState.monsters[monsterEntityKey].speed = 20; // Monster is faster
            const newState = handleStartBattle(gameState, monsterEntityKey);
            expect(newState.interactionState.type).toBe('battle');
            if (newState.interactionState.type === 'battle') {
                expect(newState.interactionState.turn).toBe('monster');
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

            const finalState = handleEndBattle(state, playerEntityKey, 'hp_depleted', []);
            expect(finalState.interactionState.type).toBe('none');
            expect(finalState.monsters[monsterEntityKey]).toBeUndefined();
        });
    });
});
