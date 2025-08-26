import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager } from '../state';
import { dataManager } from '../../data/data-manager';
import * as _ from 'lodash';
import { checkForLevelUp } from '../logic';

describe('Plan 023 Stat Refactoring', () => {
    let gameStateManager: GameStateManager;

    beforeEach(async () => {
        // Create a fresh instance of the manager for each test
        gameStateManager = new GameStateManager();
        await dataManager.loadAllData();
    });

    it('should create a player with correct stats based on level 1 data', async () => {
        await gameStateManager.createAndInitializeState(1); // Assuming floor 1 exists
        const state = gameStateManager.getState();
        const player = state.player;

        const level1Data = dataManager.getLevelData().find((ld) => ld.level === 1);
        expect(level1Data).toBeDefined();

        expect(player.level).toBe(1);
        expect(player.maxhp).toBe(level1Data!.maxhp);
        expect(player.attack).toBe(level1Data!.attack);
        expect(player.defense).toBe(level1Data!.defense);
        expect(player.speed).toBe(level1Data!.speed);
        expect(player.hp).toBe(100); // from playerdata.json
    });

    it('should update player stats correctly on level up', async () => {
        await gameStateManager.createAndInitializeState(1);
        let state = gameStateManager.getState();

        // Give player enough EXP to level up to level 2
        state.player.exp = 100;

        // Run the level up check
        state = checkForLevelUp(state);
        const player = state.player;

        const level2Data = dataManager.getLevelData().find((ld) => ld.level === 2);
        expect(level2Data).toBeDefined();

        expect(player.level).toBe(2);
        expect(player.maxhp).toBe(level2Data!.maxhp);
        expect(player.attack).toBe(level2Data!.attack);
        expect(player.defense).toBe(level2Data!.defense);
        expect(player.speed).toBe(level2Data!.speed);
        // HP should be restored to new maxHP
        expect(player.hp).toBe(level2Data!.maxhp);
    });

    it('should not affect monster stats initialization', async () => {
        await gameStateManager.createAndInitializeState(1);
        const state = gameStateManager.getState();

        // Find a monster to test. Let's find the first one.
        const monsterKey = Object.keys(state.monsters)[0];
        expect(monsterKey).toBeDefined();
        const monster = state.monsters[monsterKey];
        expect(monster).toBeDefined();

        const monsterData = dataManager.getMonsterData(monster.id);
        expect(monsterData).toBeDefined();

        // Check that monster stats match their data file, not player level data
        expect(monster.maxhp).toBe(monsterData!.maxhp);
        expect(monster.attack).toBe(monsterData!.attack);
        expect(monster.defense).toBe(monsterData!.defense);
    });
});
