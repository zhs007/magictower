import { describe, it, expect } from 'vitest';
import { GameStateManager } from '../state';

const basePlayer = {
    id: 'player',
    name: 'Hero',
    level: 1,
    exp: 0,
    hp: 10,
    attack: 2,
    defense: 1,
    speed: 1,
    keys: { yellow: 0, blue: 0, red: 0 },
};

describe('GameStateManager map normalization', () => {
    it('returns GameState with canonical MapLayout from data manager', async () => {
        const mapLayout = {
            floor: 1,
            layout: [
                ['0', '1'],
                ['0', '0'],
            ],
            tileAssets: {
                '0': { assetId: 'map_floor', isEntity: false },
                '1': { assetId: 'map_wall', isEntity: true },
            },
            entities: {
                player_start: { type: 'player_start' as const, id: 'player', x: 0, y: 0 },
            },
        };

        const dmStub = {
            async loadAllData() {
                /* noop */
            },
            getMapLayout() {
                return mapLayout;
            },
            getPlayerData() {
                return basePlayer;
            },
            getLevelData() {
                return [{ level: 1, exp_needed: 0, maxhp: 10, attack: 2, defense: 1, speed: 1 }];
            },
            getMonsterData() {
                return undefined;
            },
            getItemData() {
                return undefined;
            },
            getEquipmentData() {
                return undefined;
            },
        };

        const manager = new GameStateManager(dmStub);
        const state = await manager.createInitialState({ floor: 1 });

        expect(state.map.floor).toBe(1);
        expect(state.map.layout).toEqual([
            [0, 1],
            [0, 0],
        ]);
        expect(state.tileAssets).toEqual(state.map.tileAssets);
        expect(state.tileAssets).toMatchObject({
            '1': { assetId: 'map_wall', isEntity: true },
        });
    });
});
