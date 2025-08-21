import { IMonster, IItem, IEquipment, IBuff } from '../core/types';

export class DataManager {
    public monsters: Record<string, IMonster> = {};
    public items: Record<string, IItem> = {};
    public equipments: Record<string, IEquipment> = {};
    public buffs: Record<string, IBuff> = {};

    private async loadJson(url: string): Promise<any> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load JSON from ${url}`);
        }
        return response.json();
    }

    public async loadAllData(): Promise<void> {
        // In a real project, we'd likely have a manifest file listing all data files.
        // For this task, we'll hardcode the paths.
        const monsterFiles = ['gamedata/monsters/monster_green_slime.json'];
        const itemFiles = ['gamedata/items/item_yellow_key.json'];
        const equipmentFiles = [
            'gamedata/equipments/broadsword.json',
            'gamedata/equipments/steel_armor.json',
            'gamedata/equipments/swift_boots.json',
            'gamedata/equipments/longbow.json',
        ];
        const buffFiles = [
            'gamedata/buffs/first_strike.json',
            'gamedata/buffs/life_saving.json',
        ];

        // Using Promise.all to load data in parallel for efficiency
        await Promise.all([
            ...monsterFiles.map(async (file) => {
                const monster = await this.loadJson(file) as IMonster;
                this.monsters[monster.id] = monster;
            }),
            ...itemFiles.map(async (file) => {
                const item = await this.loadJson(file) as IItem;
                this.items[item.id] = item;
            }),
            ...equipmentFiles.map(async (file) => {
                const equipment = await this.loadJson(file) as IEquipment;
                this.equipments[equipment.id] = equipment;
            }),
            ...buffFiles.map(async (file) => {
                const buff = await this.loadJson(file) as IBuff;
                this.buffs[buff.id] = buff;
            }),
        ]);
    }
}

// Export a singleton instance of the data manager
export const dataManager = new DataManager();
