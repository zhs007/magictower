import { describe, it, expect, beforeAll } from 'vitest';
import { handleEndBattle } from '../logic';
import { dataManager } from '../../data/data-manager';
import { IPlayer, GameState, IMonster } from '../types';

describe('Plan 021: Leveling and Experience System (with real data)', () => {
    beforeAll(async () => {
        await dataManager.loadAllData();
    });

    it('should load player and level data correctly', () => {
        const playerData = dataManager.getPlayerData();
        const levelData = dataManager.getLevelData();

        expect(playerData).not.toBeNull();
        expect(playerData?.name).toBe('Hero');
        expect(levelData.length).toBe(5);
    });

    it('should award correct experience points after a battle', () => {
        const l1Data = dataManager.getLevelData().find((l) => l.level === 1)!;
        const player: IPlayer = {
            ...dataManager.getPlayerData()!,
            ...l1Data,
            maxhp: l1Data.hp, // Explicitly set maxhp
            exp: 0,
            x: 0,
            y: 0,
            direction: 'right',
            equipment: {},
            backupEquipment: [],
            buffs: [],
        };

        const monsterData = dataManager.getMonsterData('level1_defense_slime')!;
        const monster: IMonster = {
            ...monsterData,
            x: 1,
            y: 0,
            direction: 'left',
            equipment: {},
            backupEquipment: [],
            buffs: [],
        };
        monster.hp = 0;

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
            interactionState: {
                type: 'battle',
                monsterId: 'monster_1',
                playerHp: 50,
                monsterHp: 0,
                round: 2,
                turn: 'battle_end',
            },
        };

        const finalState = handleEndBattle(initialState, 'player_start', 'hp_depleted');

        expect(finalState.player.exp).toBe(monsterData.exp);
    });

    it('should level up the player when experience threshold is met', () => {
        const l1Data = dataManager.getLevelData().find((l) => l.level === 1)!;
        const l2Data = dataManager.getLevelData().find((l) => l.level === 2)!;
        const player: IPlayer = {
            ...dataManager.getPlayerData()!,
            ...l1Data,
            maxhp: l1Data.hp, // Explicitly set maxhp
            exp: l2Data.exp_needed - 20,
            x: 0,
            y: 0,
            direction: 'right',
            equipment: {},
            backupEquipment: [],
            buffs: [],
        };

        const monsterData = dataManager.getMonsterData('level1_average_slime')!;
        const monster: IMonster = {
            ...monsterData,
            x: 1,
            y: 0,
            direction: 'left',
            equipment: {},
            backupEquipment: [],
            buffs: [],
        };
        monster.hp = 0;

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
            interactionState: {
                type: 'battle',
                monsterId: 'monster_1',
                playerHp: 50,
                monsterHp: 0,
                round: 2,
                turn: 'battle_end',
            },
        };

        const finalState = handleEndBattle(initialState, 'player_start', 'hp_depleted');

        expect(finalState.player.level).toBe(2);
        expect(finalState.player.exp).toBe(l2Data.exp_needed - 20 + (monster.exp ?? 0));
        expect(finalState.player.maxhp).toBe(l2Data.hp);
        expect(finalState.player.attack).toBe(l2Data.attack);
    });
});
