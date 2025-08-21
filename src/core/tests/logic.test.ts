import { describe, it, expect, beforeEach } from 'vitest';
import { calculateBattleOutcome } from '../logic';
import { IPlayer, IMonster, IEquipment, IBuff, EquipmentSlot, BuffTrigger } from '../types';

describe('calculateBattleOutcome', () => {
    it('should calculate a battle where the player wins', () => {
        const player: IPlayer = { id: 'player', name: 'Hero', hp: 100, attack: 10, defense: 5, x: 0, y: 0, equipment: {}, backupEquipment: [], buffs: [] };
        const monster: IMonster = { id: 'monster', name: 'Slime', hp: 50, attack: 5, defense: 2, x: 0, y: 0, equipment: {}, backupEquipment: [], buffs: [] };

        const outcome = calculateBattleOutcome(player, monster);

        expect(outcome.didPlayerWin).toBe(true);
        expect(outcome.playerHpLoss).toBeLessThan(player.hp);
        expect(outcome.monsterHpLoss).toBe(50);
    });

    it('should calculate a battle where the player loses', () => {
        const player: IPlayer = { id: 'player', name: 'Hero', hp: 50, attack: 5, defense: 2, x: 0, y: 0, equipment: {}, backupEquipment: [], buffs: [] };
        const monster: IMonster = { id: 'monster', name: 'Dragon', hp: 100, attack: 10, defense: 5, x: 0, y: 0, equipment: {}, backupEquipment: [], buffs: [] };

        const outcome = calculateBattleOutcome(player, monster);

        expect(outcome.didPlayerWin).toBe(false);
        expect(outcome.playerHpLoss).toBe(50);
        expect(outcome.monsterHpLoss).toBeLessThan(monster.hp);
    });

    it('should handle a battle where player attack is less than monster defense', () => {
        const player: IPlayer = { id: 'player', name: 'Hero', hp: 100, attack: 5, defense: 10, x: 0, y: 0, equipment: {}, backupEquipment: [], buffs: [] };
        const monster: IMonster = { id: 'monster', name: 'Stone Golem', hp: 100, attack: 10, defense: 10, x: 0, y: 0, equipment: {}, backupEquipment: [], buffs: [] };

        const outcome = calculateBattleOutcome(player, monster);

        expect(outcome.didPlayerWin).toBe(false); // Player can't damage the monster
        expect(outcome.playerHpLoss).toBe(100);
        expect(outcome.monsterHpLoss).toBe(0);
    });
});

describe('calculateBattleOutcome with Equipment and Buffs', () => {
    it('should correctly calculate battle outcome with equipment bonuses', () => {
        const player: IPlayer = {
            id: 'player', name: 'Hero', hp: 100, attack: 10, defense: 5, x: 0, y: 0,
            equipment: {
                [EquipmentSlot.RIGHT_HAND]: { id: 'eq_broadsword', name: 'Broadsword', slot: EquipmentSlot.RIGHT_HAND, attackBonus: 20 },
                [EquipmentSlot.BODY]: { id: 'eq_steel_armor', name: 'Steel Armor', slot: EquipmentSlot.BODY, defenseBonus: 50 }
            },
            backupEquipment: [],
            buffs: []
        };
        const monster: IMonster = { id: 'monster', name: 'Slime', hp: 100, attack: 50, defense: 20, x: 0, y: 0, equipment: {}, backupEquipment: [], buffs: [] };

        // Player stats with equipment: attack=30, defense=55
        // Monster stats: attack=50, defense=20
        // Player damage to monster: max(0, 30 - 20) = 10
        // Monster damage to player: max(0, 50 - 55) = 0
        // Player should win without taking any damage.
        const outcome = calculateBattleOutcome(player, monster);

        expect(outcome.didPlayerWin).toBe(true);
        expect(outcome.playerHpLoss).toBe(0);
        expect(outcome.monsterHpLoss).toBe(100);
    });

    it('should correctly apply "First Strike" buff', () => {
        const player: IPlayer = {
            id: 'player', name: 'Hero', hp: 100, attack: 50, defense: 5, x: 0, y: 0,
            equipment: {},
            backupEquipment: [],
            buffs: [{ id: 'buff_first_strike', name: 'First Strike', duration: 1, charges: 1, triggers: [BuffTrigger.ON_BATTLE_START] }]
        };
        const monster: IMonster = { id: 'monster', name: 'Slime', hp: 40, attack: 100, defense: 10, x: 0, y: 0, equipment: {}, backupEquipment: [], buffs: [] };

        // Player damage to monster: 50 - 10 = 40
        // With first strike, player attacks first and defeats the monster instantly.
        const outcome = calculateBattleOutcome(player, monster);

        expect(outcome.didPlayerWin).toBe(true);
        expect(outcome.playerHpLoss).toBe(0);
        expect(outcome.monsterHpLoss).toBe(40);
    });

    it('should correctly apply "Life Saving" buff', () => {
        const player: IPlayer = {
            id: 'player', name: 'Hero', hp: 100, attack: 10, defense: 5, x: 0, y: 0,
            equipment: {},
            backupEquipment: [],
            buffs: [{ id: 'buff_life_saving', name: 'Life Saving', duration: -1, charges: 1, triggers: [BuffTrigger.ON_HP_LESS_THAN_ZERO] }]
        };
        const monster: IMonster = { id: 'monster', name: 'Dragon', hp: 1000, attack: 105, defense: 5, x: 0, y: 0, equipment: {}, backupEquipment: [], buffs: [] };

        // Monster damage to player: 105 - 5 = 100. Player should be defeated in one hit.
        // With life saving buff, player should survive with 1 HP.
        const outcome = calculateBattleOutcome(player, monster);

        expect(outcome.didPlayerWin).toBe(false);
        // Player is saved once, but defeated on the next hit. Final HP is 0.
        expect(outcome.playerHpLoss).toBe(100);
    });
});

import { handleMove, handlePickupItem, handleOpenDoor } from '../logic';
import { GameState, EntityType } from '../types';

describe('handleMove', () => {
    let gameState: GameState;

    beforeEach(() => {
        gameState = {
            currentFloor: 1,
            map: [
                [{ groundLayer: 1 }, { groundLayer: 1 }, { groundLayer: 1 }],
                [{ groundLayer: 1 }, { groundLayer: 1, entityLayer: { type: EntityType.WALL, id: 'wall' } }, { groundLayer: 1 }],
                [{ groundLayer: 1 }, { groundLayer: 1 }, { groundLayer: 1 }],
            ],
            player: { id: 'player', name: 'Hero', hp: 100, attack: 10, defense: 5, x: 0, y: 0, equipment: {}, backupEquipment: [], buffs: [] },
            monsters: {},
            items: {},
            equipments: {},
            doors: {},
        };
    });

    it('should allow player to move to an empty tile', () => {
        const newState = handleMove(gameState, 1, 0);
        expect(newState.player.x).toBe(1);
        expect(newState.player.y).toBe(0);
    });

    it('should not allow player to move out of bounds', () => {
        const newState = handleMove(gameState, -1, 0);
        expect(newState.player.x).toBe(0);
        expect(newState.player.y).toBe(0);
    });
});

describe('handlePickupItem', () => {
    it('should allow player to pick up a potion and increase HP', () => {
        const gameState: GameState = {
            currentFloor: 1,
            map: [
                [{ groundLayer: 1, entityLayer: { type: EntityType.ITEM, id: 'potion1' } }],
            ],
            player: { id: 'player', name: 'Hero', hp: 50, attack: 10, defense: 5, x: 0, y: 0, equipment: {}, backupEquipment: [], buffs: [] },
            monsters: {},
            items: { 'potion1': { id: 'potion1', name: 'Health Potion', type: 'potion', value: 20 } },
            equipments: {},
            doors: {},
        };

        const newState = handlePickupItem(gameState, 'potion1');
        expect(newState.player.hp).toBe(70);
        expect(newState.items['potion1']).toBeUndefined();
        expect(newState.map[0][0].entityLayer).toBeUndefined();
    });
});

describe('handleOpenDoor', () => {
    it('should allow player to open a door', () => {
        const gameState: GameState = {
            currentFloor: 1,
            map: [
                [{ groundLayer: 1, entityLayer: { type: EntityType.DOOR, id: 'door1' } }],
            ],
            player: { id: 'player', name: 'Hero', hp: 100, attack: 10, defense: 5, x: 0, y: 0, equipment: {}, backupEquipment: [], buffs: [] },
            monsters: {},
            items: {},
            equipments: {},
            doors: { 'door1': { id: 'door1', color: 'yellow' } },
        };

        const newState = handleOpenDoor(gameState, 'door1');
        expect(newState.doors['door1']).toBeUndefined();
        expect(newState.map[0][0].entityLayer).toBeUndefined();
    });
});
