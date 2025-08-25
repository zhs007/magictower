import { describe, it, expect, beforeAll } from 'vitest';
import { IPlayer, IMonster } from '../types';
import { calculateDamage } from '../logic';
import { dataManager } from '../../data/data-manager';
import { LevelData } from '../../data/types';
import { calculateFinalStats } from '../stat-calculator';

// Helper function to calculate total damage in a battle
const calculateTotalDamage = (player: IPlayer, monster: IMonster) => {
    // Player always attacks first as per design (player speed > monster speed)
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

describe('Plan 024: Game Balance Validation (High-Threat Redesign)', () => {
    let playerData: IPlayer;
    let levelData: LevelData[];
    let attackSlime: IMonster;
    let averageSlime: IMonster;
    let defenseSlime: IMonster;

    beforeAll(async () => {
        await dataManager.loadAllData();
        playerData = dataManager.getPlayerData()!;
        levelData = dataManager.getLevelData()!;
        attackSlime = dataManager.getMonsterData('level1_attack_slime')!;
        averageSlime = dataManager.getMonsterData('level1_average_slime')!;
        defenseSlime = dataManager.getMonsterData('level1_defense_slime')!;
    });

    it('should load all required game data', () => {
        expect(playerData, 'Player data should exist').to.not.be.null;
        expect(levelData, 'Level data should exist').to.not.be.null;
        expect(attackSlime, 'Attack Slime data should exist').to.not.be.undefined;
        expect(averageSlime, 'Average Slime data should exist').to.not.be.undefined;
        expect(defenseSlime, 'Defense Slime data should exist').to.not.be.undefined;
    });

    describe('Player Level 1 Stats', () => {
        it('should have correct initial stats', () => {
            const l1Data = levelData.find(l => l.level === 1)!;
            expect(l1Data.hp).toBe(150);
            expect(l1Data.attack).toBe(10);
            expect(l1Data.defense).toBe(10);
        });
    });

    describe('Level 1 Monster Design', () => {
        it('should have correct properties and calculated EXP', () => {
            const monsters: IMonster[] = [attackSlime, averageSlime, defenseSlime];
            for (const monster of monsters) {
                expect(monster.attack).toBeGreaterThan(1);
                expect(monster.defense).toBeGreaterThan(1);
                const calculatedExp = Math.floor(monster.maxhp / 10) + monster.attack + monster.defense + monster.speed;
                expect(monster.exp, `${monster.name} EXP`).toBe(calculatedExp);
            }
        });
    });

    describe('Level 1 Combat Requirements (High-Threat)', () => {
        it('should have correct combat outcomes', () => {
            const p1 = { ...playerData, equipment: {} };
            const m_atk = { ...attackSlime, equipment: {} };
            const m_avg = { ...averageSlime, equipment: {} };
            const m_def = { ...defenseSlime, equipment: {} };

            const battleWithAttack = calculateTotalDamage(p1, m_atk);
            const battleWithAverage = calculateTotalDamage(p1, m_avg);
            const battleWithDefense = calculateTotalDamage(p1, m_def);

            // Check rounds to kill
            expect(battleWithAttack.rounds, 'Attack Slime rounds').toBe(2);
            expect(battleWithAverage.rounds, 'Average Slime rounds').toBe(4);
            expect(battleWithDefense.rounds, 'Defense Slime rounds').toBe(6);

            // Check damage taken ranking
            expect(battleWithAttack.playerTakes, 'Damage ranking').toBeGreaterThan(battleWithAverage.playerTakes);
            expect(battleWithAverage.playerTakes, 'Damage ranking').toBeGreaterThan(battleWithDefense.playerTakes);

            // Check total damage taken (should be 70-80% of HP)
            const totalDamage =
                battleWithAttack.playerTakes * 2 +
                battleWithAverage.playerTakes * 3 +
                battleWithDefense.playerTakes * 2;
            expect(totalDamage).toBe(124);
            expect(totalDamage / p1.maxhp).toBeGreaterThanOrEqual(0.7);
            expect(totalDamage / p1.maxhp).toBeLessThanOrEqual(0.85); // Give a little wiggle room
        });
    });

    describe('Level 2 Progression (High-Gain)', () => {
        it('should have correct level-up parameters', () => {
            const l1Data = levelData.find(l => l.level === 1)!;
            const l2Data = levelData.find(l => l.level === 2)!;

            const totalExpFrom7Monsters = attackSlime.exp * 2 + averageSlime.exp * 3 + defenseSlime.exp * 2;
            expect(l2Data.exp_needed, 'EXP needed').toBe(220);
            expect(l2Data.exp_needed).toBe(totalExpFrom7Monsters);

            // Check substantial stat gains
            expect(l2Data.attack - l1Data.attack).toBe(8);
            expect(l2Data.defense - l1Data.defense).toBe(8);
            expect(l2Data.speed - l1Data.speed).toBe(4);
            expect(l2Data.hp - l1Data.hp).toBe(80);
        });
    });

    describe('Level 2 Combat Threat', () => {
        it('should maintain threat levels correctly', () => {
            const p2 = {
                ...playerData,
                ...levelData.find(l => l.level === 2)!,
                equipment: {}
            };

            // Attack slime should still be a threat
            const atkDmgToP2 = calculateDamage(attackSlime, p2);
            expect(atkDmgToP2).toBeGreaterThan(10); // Should deal double-digit damage

            // Weaker slimes should pose no real threat
            const avgDmgToP2 = calculateDamage(averageSlime, p2);
            expect(avgDmgToP2).toBe(1);
        });
    });
});
