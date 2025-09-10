import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameStateManager } from '../state';
import { handleEndBattle, IPlayer, GameState, IMonster } from '@proj-tower/logic-core';
import { dataManager } from '../../data/data-manager';

// Mock data modules
vi.mock('/gamedata/playerdata.json', () => ({
    default: {
        id: 'player',
        name: 'Hero',
        level: 1,
        exp: 0,
        hp: 100,
        keys: { yellow: 0, blue: 0, red: 0 },
    },
}));

vi.mock('/gamedata/leveldata.json', () => ({
    default: [
        { level: 1, exp_needed: 0, maxhp: 100, attack: 10, defense: 10, speed: 10 },
        { level: 2, exp_needed: 100, maxhp: 120, attack: 12, defense: 12, speed: 11 },
        { level: 3, exp_needed: 250, maxhp: 140, attack: 14, defense: 14, speed: 12 },
    ],
}));

describe('Plan 021: Leveling and Experience System', () => {
    beforeEach(async () => {
        // Reset and load fresh data for each test
        vi.resetModules();
        await dataManager.loadAllData();
    });

    it('should load player and level data correctly', () => {
        const playerData = dataManager.getPlayerData();
        const levelData = dataManager.getLevelData();

        expect(playerData).not.toBeNull();
        expect(playerData?.name).toBe('Hero');
        expect(playerData?.level).toBe(1);

        expect(levelData).not.toBeNull();
        expect(levelData.length).toBe(3);
        expect(levelData[1].level).toBe(2);
        expect(levelData[1].exp_needed).toBe(100);
    });

    it('should award correct experience points after a battle', () => {
        const player: IPlayer = {
            id: 'player',
            name: 'Hero',
            level: 1,
            exp: 0,
            hp: 50,
            maxhp: 100,
            attack: 10,
            defense: 10,
            speed: 10,
            x: 0,
            y: 0,
            direction: 'right',
            equipment: {},
            backupEquipment: [],
            buffs: [],
            keys: { yellow: 0, blue: 0, red: 0 },
        };

        const monster: IMonster = {
            id: 'monster_1',
            name: 'Test Monster',
            level: 1,
            hp: 0,
            maxhp: 50,
            attack: 10,
            defense: 5,
            speed: 5,
            x: 1,
            y: 0,
            direction: 'left',
            equipment: {},
            backupEquipment: [],
            buffs: [],
        };

        const initialState: GameState = {
            currentFloor: 1,
            map: [[]],
            player,
            monsters: { monster_1: monster },
            entities: {
                player_start: { ...player, type: 'player_start' },
                monster_1: { ...monster, type: 'monster' },
            },
            items: {},
            equipments: {},
            doors: {},
            stairs: {},
            interactionState: {
                type: 'battle',
                monsterId: 'monster_1',
                playerHp: 50,
                monsterHp: 0,
                round: 2,
                turn: 'battle_end',
            },
        };

        const levelData = dataManager.getLevelData();
        const finalState = handleEndBattle(initialState, 'player_start', 'hp_depleted', levelData);

        // reward_exp = maxhp/10 + attack + defense + speed
        // reward_exp = 50/10 + 10 + 5 + 5 = 5 + 10 + 5 + 5 = 25
        expect(finalState.player.exp).toBe(25);
    });

    it('should level up the player when experience threshold is met', () => {
        const player: IPlayer = {
            id: 'player',
            name: 'Hero',
            level: 1,
            exp: 90,
            hp: 50,
            maxhp: 100,
            attack: 10,
            defense: 10,
            speed: 10,
            x: 0,
            y: 0,
            direction: 'right',
            equipment: {},
            backupEquipment: [],
            buffs: [],
            keys: { yellow: 0, blue: 0, red: 0 },
        };

        const monster: IMonster = {
            id: 'monster_1',
            name: 'Test Monster',
            level: 1,
            hp: 0,
            maxhp: 50,
            attack: 10,
            defense: 5,
            speed: 5,
            x: 1,
            y: 0,
            direction: 'left',
            equipment: {},
            backupEquipment: [],
            buffs: [],
        };

        const initialState: GameState = {
            currentFloor: 1,
            map: [[]],
            player,
            monsters: { monster_1: monster },
            entities: {
                player_start: { ...player, type: 'player_start' },
                monster_1: { ...monster, type: 'monster' },
            },
            items: {},
            equipments: {},
            doors: {},
            stairs: {},
            interactionState: {
                type: 'battle',
                monsterId: 'monster_1',
                playerHp: 50,
                monsterHp: 0,
                round: 2,
                turn: 'battle_end',
            },
        };

        // EXP gain is 25, total EXP will be 115, which is > 100 (for level 2)
        const levelData = dataManager.getLevelData();
        const finalState = handleEndBattle(initialState, 'player_start', 'hp_depleted', levelData);

        expect(finalState.player.level).toBe(2);
        expect(finalState.player.exp).toBe(115);

        // Check stats against mocked leveldata for level 2
        expect(finalState.player.maxhp).toBe(120);
        expect(finalState.player.hp).toBe(120); // HP restored to new maxhp
        expect(finalState.player.attack).toBe(12);
        expect(finalState.player.defense).toBe(12);
        expect(finalState.player.speed).toBe(11);
    });

    it('should handle multiple level-ups from a single experience gain', () => {
        const player: IPlayer = {
            id: 'player',
            name: 'Hero',
            level: 1,
            exp: 0,
            hp: 50,
            maxhp: 100,
            attack: 10,
            defense: 10,
            speed: 10,
            x: 0,
            y: 0,
            direction: 'right',
            equipment: {},
            backupEquipment: [],
            buffs: [],
            keys: { yellow: 0, blue: 0, red: 0 },
        };

        // This monster gives a huge amount of EXP
        const monster: IMonster = {
            id: 'monster_1',
            name: 'EXP Pinata',
            level: 1,
            hp: 0,
            maxhp: 2000,
            attack: 100,
            defense: 50,
            speed: 50,
            x: 1,
            y: 0,
            direction: 'left',
            equipment: {},
            backupEquipment: [],
            buffs: [],
        };

        const initialState: GameState = {
            currentFloor: 1,
            map: [[]],
            player,
            monsters: { monster_1: monster },
            entities: {
                player_start: { ...player, type: 'player_start' },
                monster_1: { ...monster, type: 'monster' },
            },
            items: {},
            equipments: {},
            doors: {},
            stairs: {},
            interactionState: {
                type: 'battle',
                monsterId: 'monster_1',
                playerHp: 50,
                monsterHp: 0,
                round: 2,
                turn: 'battle_end',
            },
        };

        // EXP gain = 2000/10 + 100 + 50 + 50 = 200 + 100 + 50 + 50 = 400
        // This is enough for level 3 (exp_needed: 250)
        const levelData = dataManager.getLevelData();
        const finalState = handleEndBattle(initialState, 'player_start', 'hp_depleted', levelData);

        expect(finalState.player.level).toBe(3);
        expect(finalState.player.exp).toBe(400);

        // Check stats against mocked leveldata for level 3
        expect(finalState.player.maxhp).toBe(140);
        expect(finalState.player.hp).toBe(140);
        expect(finalState.player.attack).toBe(14);
        expect(finalState.player.defense).toBe(14);
        expect(finalState.player.speed).toBe(12);
    });
});
