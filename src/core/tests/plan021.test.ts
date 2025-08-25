import { describe, it, expect, beforeAll } from 'vitest';
import { GameStateManager } from '../state';
import { handleEndBattle } from '../logic';
import { dataManager } from '../../data/data-manager';
import { IPlayer, GameState, IMonster } from '../types';

describe('Plan 021: Leveling and Experience System (with real data)', () => {
    beforeAll(async () => {
        // Load real data once for all tests in this file
        await dataManager.loadAllData();
    });

    it('should load player and level data correctly', () => {
        const playerData = dataManager.getPlayerData();
        const levelData = dataManager.getLevelData();

        expect(playerData).not.toBeNull();
        expect(playerData?.name).toBe('Hero');
        expect(levelData.length).toBe(5); // Now using real data with 5 levels
    });

    it('should award correct experience points after a battle', () => {
        const l1Data = dataManager.getLevelData().find(l => l.level === 1)!;
        const player: IPlayer = {
            ...dataManager.getPlayerData()!,
            ...l1Data,
            x: 0, y: 0, direction: 'right', equipment: {}, backupEquipment: [], buffs: [],
        };

        // Use one of the real monsters
        const monster: IMonster = dataManager.getMonsterData('level1_defense_slime')!;
        monster.hp = 0; // Simulate it being defeated

        const initialState: GameState = {
            currentFloor: 1, map: [[]], player,
            monsters: { monster_1: monster },
            entities: { player_start: { ...player, type: 'player_start' }, monster_1: { ...monster, type: 'monster' } },
            items: {}, equipments: {}, doors: {},
            interactionState: { type: 'battle', monsterId: 'monster_1', playerHp: 50, monsterHp: 0, round: 2, turn: 'battle_end' },
        };

        const finalState = handleEndBattle(initialState, 'player_start', 'hp_depleted');

        // Real EXP for Defense Slime: floor(30/10) + 13 + 5 + 3 = 3 + 24 = 27. Wait, my plan said 24. Let's re-calc. 3+13+5+3 = 24. Correct.
        expect(finalState.player.exp).toBe(24);
    });

    it('should level up the player when experience threshold is met', () => {
        const l1Data = dataManager.getLevelData().find(l => l.level === 1)!;
        const l2Data = dataManager.getLevelData().find(l => l.level === 2)!;
        const player: IPlayer = {
            ...dataManager.getPlayerData()!,
            ...l1Data,
            exp: l2Data.exp_needed - 20, // Start just before level up
            x: 0, y: 0, direction: 'right', equipment: {}, backupEquipment: [], buffs: [],
        };

        // This monster should provide enough EXP to level up
        const monster: IMonster = dataManager.getMonsterData('level1_average_slime')!; // Gives 28 EXP
        monster.hp = 0;

        const initialState: GameState = {
            currentFloor: 1, map: [[]], player,
            monsters: { monster_1: monster },
            entities: { player_start: { ...player, type: 'player_start' }, monster_1: { ...monster, type: 'monster' } },
            items: {}, equipments: {}, doors: {},
            interactionState: { type: 'battle', monsterId: 'monster_1', playerHp: 50, monsterHp: 0, round: 2, turn: 'battle_end' },
        };

        const finalState = handleEndBattle(initialState, 'player_start', 'hp_depleted');

        expect(finalState.player.level).toBe(2);
        expect(finalState.player.exp).toBe(l2Data.exp_needed - 20 + monster.exp);
        expect(finalState.player.maxhp).toBe(l2Data.hp);
        expect(finalState.player.attack).toBe(l2Data.attack);
    });
});
