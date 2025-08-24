import { dataManager } from '../data-manager';

describe('DataManager', () => {
    beforeAll(async () => {
        // Load all data once before any tests run
        await dataManager.loadAllData();
    });

    it('should load all monster data from files', () => {
        expect(dataManager.monsters.size).toBeGreaterThan(0);
        const monster = dataManager.getMonsterData('monster_green_slime'); // Correct ID
        expect(monster).toBeDefined();
        expect(monster?.name).toBe('Green Slime');
    });

    it('should load all item data from files', () => {
        expect(dataManager.items.size).toBeGreaterThan(0);
        const item = dataManager.getItemData('item_yellow_key'); // Correct ID
        expect(item).toBeDefined();
        expect(item?.name).toBe('Yellow Key');
    });

    it('should load all equipment data from files', () => {
        expect(dataManager.equipments.size).toBeGreaterThan(0);
        const eq = dataManager.getEquipmentData('broadsword'); // Correct ID
        expect(eq).toBeDefined();
        expect(eq?.name).toBe('Broadsword');
    });

    it('should load the map layout for floor 1 correctly', () => {
        const mapLayout = dataManager.getMapLayout(1);
        expect(mapLayout).toBeDefined();
        expect(mapLayout?.floor).toBe(1);
        expect(mapLayout?.layout.length).toBeGreaterThan(0);
    });

    it('should return undefined for non-existent data', () => {
        const monster = dataManager.getMonsterData('non_existent_monster');
        expect(monster).toBeUndefined();
    });
});
