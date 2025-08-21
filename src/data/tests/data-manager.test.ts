import { describe, it, expect, beforeAll } from 'vitest';
import { dataManager } from '../data-manager';

describe('DataManager', () => {

    // Load the real data once before any tests run.
    beforeAll(async () => {
        await dataManager.loadAllData();
    });

    it('should load all monster data from files', () => {
        expect(dataManager.monsters.size).toBeGreaterThan(0);
        const monster = dataManager.getMonsterData('monster_green_slime');
        expect(monster).toBeDefined();
        expect(monster?.name).toBe('Green Slime');
    });

    it('should load all item data from files', () => {
        expect(dataManager.items.size).toBeGreaterThan(0);
        const item = dataManager.getItemData('item_yellow_key');
        expect(item).toBeDefined();
        expect(item?.name).toBe('Yellow Key');
    });

    it('should load all equipment data from files', () => {
        expect(dataManager.equipments.size).toBeGreaterThan(0);
        const eq = dataManager.getEquipmentData('eq_broadsword');
        expect(eq).toBeDefined();
        expect(eq?.name).toBe('Broadsword');
    });

    it('should load all buff data from files', () => {
        expect(dataManager.buffs.size).toBeGreaterThan(0);
        const buff = dataManager.getBuffData('buff_first_strike');
        expect(buff).toBeDefined();
        expect(buff?.name).toBe('First Strike');
    });

    it('should load the map layout for floor 1 correctly', () => {
        const map = dataManager.getMapLayout(1);
        expect(map).toBeDefined();
        expect(map?.floor).toBe(1);
        expect(map?.layout).toEqual([
            [1, 1, 1, 1, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 1, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 1, 1, 1, 1]
        ]);
        expect(map?.entities).toBeDefined();
    });

    it('should return undefined for non-existent data', () => {
        expect(dataManager.getMonsterData('non_existent')).toBeUndefined();
        expect(dataManager.getItemData('non_existent')).toBeUndefined();
        expect(dataManager.getMapLayout(99)).toBeUndefined();
    });
});
