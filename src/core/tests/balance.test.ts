import { describe, it, expect, beforeAll } from 'vitest';
import { IPlayer, IMonster } from '../types';
import { calculateDamage } from '../logic';
import { dataManager } from '../../data/data-manager';
import { LevelData, MonsterData } from '../../data/types';

// Helper function to calculate total damage in a battle
const calculateTotalDamage = (player: IPlayer, monster: IMonster) => {
    const pDmg = calculateDamage(player, monster);
    const mDmg = calculateDamage(monster, player);

    if (pDmg <= 0) return { playerTakes: Infinity, rounds: Infinity };

    const hitsToWin = Math.ceil(monster.maxhp / pDmg);
    const monsterHits = hitsToWin - 1;
    const totalDamageToPlayer = monsterHits > 0 ? monsterHits * mDmg : 0;

    return {
        playerTakes: totalDamageToPlayer,
        rounds: hitsToWin,
    };
};

describe('Game Balance Validation (High-Threat Redesign)', () => {
    let playerData: IPlayer;
    let levelData: LevelData[];
    let attackSlimeData: MonsterData;
    let averageSlimeData: MonsterData;
    let defenseSlimeData: MonsterData;

    beforeAll(async () => {
        await dataManager.loadAllData();
        const pData = dataManager.getPlayerData()!;
        const l1Data = dataManager.getLevelData().find((l) => l.level === 1)!;
        playerData = {
            ...pData,
            ...l1Data,
            maxhp: l1Data.hp,
            x: 0,
            y: 0,
            direction: 'right',
            equipment: {},
            backupEquipment: [],
            buffs: [],
        };

        levelData = dataManager.getLevelData()!;
        attackSlimeData = dataManager.getMonsterData('level1_attack_slime')!;
        averageSlimeData = dataManager.getMonsterData('level1_average_slime')!;
        defenseSlimeData = dataManager.getMonsterData('level1_defense_slime')!;
    });

    it('should load all required game data', () => {
        expect(playerData).toBeDefined();
        expect(levelData).toBeDefined();
        expect(attackSlimeData).toBeDefined();
    });

    it('should have correct Level 1 stats', () => {
        const l1Data = levelData.find((l) => l.level === 1)!;
        expect(l1Data.hp).toBe(150);
        expect(l1Data.attack).toBe(10);
        expect(l1Data.defense).toBe(10);
    });

    it('should have correct monster properties and calculated EXP', () => {
        const monsters: MonsterData[] = [attackSlimeData, averageSlimeData, defenseSlimeData];
        for (const monster of monsters) {
            expect(monster.attack).toBeGreaterThan(1);
            expect(monster.defense).toBeGreaterThan(1);
            const calculatedExp =
                Math.floor(monster.maxhp / 10) + monster.attack + monster.defense + monster.speed;
            expect(monster.exp, `${monster.name} EXP`).toBe(calculatedExp);
        }
    });

    it('should have correct Level 1 combat outcomes', () => {
        const l1Data = levelData.find((l) => l.level === 1)!;
        const p1: IPlayer = {
            ...playerData,
            ...l1Data,
            x: 0,
            y: 0,
            direction: 'right',
            equipment: {},
            backupEquipment: [],
            buffs: [],
        };

        const m_atk: IMonster = {
            ...attackSlimeData,
            x: 0,
            y: 0,
            direction: 'right',
            equipment: {},
            backupEquipment: [],
            buffs: [],
        };
        const m_avg: IMonster = {
            ...averageSlimeData,
            x: 0,
            y: 0,
            direction: 'right',
            equipment: {},
            backupEquipment: [],
            buffs: [],
        };
        const m_def: IMonster = {
            ...defenseSlimeData,
            x: 0,
            y: 0,
            direction: 'right',
            equipment: {},
            backupEquipment: [],
            buffs: [],
        };

        const battleWithAttack = calculateTotalDamage(p1, m_atk);
        const battleWithAverage = calculateTotalDamage(p1, m_avg);
        const battleWithDefense = calculateTotalDamage(p1, m_def);

        expect(battleWithAttack.rounds, 'Attack Slime rounds').toBe(2);
        expect(battleWithAverage.rounds, 'Average Slime rounds').toBe(4);
        expect(battleWithDefense.rounds, 'Defense Slime rounds').toBe(6);

        expect(battleWithAttack.playerTakes, 'Damage ranking').toBeGreaterThan(
            battleWithAverage.playerTakes
        );
        expect(battleWithAverage.playerTakes, 'Damage ranking').toBeGreaterThan(
            battleWithDefense.playerTakes
        );

        const totalDamage =
            battleWithAttack.playerTakes * 2 +
            battleWithAverage.playerTakes * 3 +
            battleWithDefense.playerTakes * 2;
        expect(totalDamage).toBe(124);
    });

    it('should have correct Level 2 progression', () => {
        const l1Data = levelData.find((l) => l.level === 1)!;
        const l2Data = levelData.find((l) => l.level === 2)!;

        const totalExpFrom7Monsters =
            attackSlimeData.exp * 2 + averageSlimeData.exp * 3 + defenseSlimeData.exp * 2;
        expect(l2Data.exp_needed).toBe(220);
        // Note: The below check is redundant if the above passes, but good for validation
        expect(220).toBe(totalExpFrom7Monsters);

        expect(l2Data.attack - l1Data.attack).toBe(8);
        expect(l2Data.defense - l1Data.defense).toBe(8);
        expect(l2Data.speed - l1Data.speed).toBe(4);
        expect(l2Data.hp - l1Data.hp).toBe(80);
    });

    it('should have correct Level 2 combat outcomes', () => {
        const l2Data = levelData.find((l) => l.level === 2)!;
        const p2: IPlayer = {
            ...playerData,
            ...l2Data,
            x: 0,
            y: 0,
            direction: 'right',
            equipment: {},
            backupEquipment: [],
            buffs: [],
        };
        const m_atk: IMonster = {
            ...attackSlimeData,
            x: 0,
            y: 0,
            direction: 'right',
            equipment: {},
            backupEquipment: [],
            buffs: [],
        };
        const m_avg: IMonster = {
            ...averageSlimeData,
            x: 0,
            y: 0,
            direction: 'right',
            equipment: {},
            backupEquipment: [],
            buffs: [],
        };

        const atkDmgToP2 = calculateDamage(m_atk, p2);
        expect(atkDmgToP2).toBeGreaterThan(10);

        const avgDmgToP2 = calculateDamage(m_avg, p2);
        expect(avgDmgToP2).toBe(1);
    });
});
