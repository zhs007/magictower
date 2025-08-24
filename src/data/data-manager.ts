import {
    MonsterData,
    ItemData,
    EquipmentData,
    BuffData,
    MapLayout,
    PlayerData,
    LevelData,
} from './types';

export class DataManager {
    public monsters: Map<string, MonsterData> = new Map();
    public items: Map<string, ItemData> = new Map();
    public equipments: Map<string, EquipmentData> = new Map();
    public buffs: Map<string, BuffData> = new Map();
    public maps: Map<number, MapLayout> = new Map();
    public playerData: PlayerData | null = null;
    public levelData: LevelData[] = [];

    public async loadAllData(): Promise<void> {
        // Using import.meta.glob to dynamically import all JSON files from a directory.
        // The `eager: true` option loads the modules immediately.
        const monsterModules = import.meta.glob('/gamedata/monsters/*.json', { eager: true });
        const itemModules = import.meta.glob('/gamedata/items/*.json', { eager: true });
        const equipmentModules = import.meta.glob('/gamedata/equipments/*.json', { eager: true });
        const buffModules = import.meta.glob('/gamedata/buffs/*.json', { eager: true });
        const mapModules = import.meta.glob('/mapdata/*.json', { eager: true });

        this.loadDataFromModules(monsterModules, this.monsters);
        this.loadDataFromModules(itemModules, this.items);
        this.loadDataFromModules(equipmentModules, this.equipments);
        this.loadDataFromModules(buffModules, this.buffs);

        for (const path in mapModules) {
            const mapData = (mapModules[path] as any).default as MapLayout;
            this.maps.set(mapData.floor, mapData);
        }

        // Load single data files
        const playerDataModule = (await import('../../gamedata/playerdata.json')).default;
        this.playerData = playerDataModule as PlayerData;

        const levelDataModule = (await import('../../gamedata/leveldata.json')).default;
        this.levelData = levelDataModule as LevelData[];
    }

    private loadDataFromModules(
        modules: Record<string, unknown>,
        targetMap: Map<string, any>
    ): void {
        for (const path in modules) {
            // The default export of the JSON module is the actual data.
            const data = (modules[path] as any).default;
            if (data && data.id) {
                // If item data is missing a 'type' field, try to derive it from the id.
                if (targetMap === this.items) {
                    if (!data.type) {
                        data.type = data.id.includes('key')
                            ? 'key'
                            : data.id.includes('potion')
                              ? 'potion'
                              : 'special';
                    }
                }

                // Register by declared id
                targetMap.set(data.id, data);

                // Also register by the JSON filename (without extension) as a fallback.
                // Many map files reference entities by the filename (e.g. 'monster_green_slime').
                try {
                    const parts = path.split('/');
                    const filename = parts[parts.length - 1].replace(/\.json$/i, '');
                    if (filename && filename !== data.id) {
                        targetMap.set(filename, data);
                    }
                } catch (e) {
                    // ignore filename-derived registration failures
                }
            }
        }
    }

    public getMonsterData(id: string): MonsterData | undefined {
        return this.monsters.get(id);
    }

    public getItemData(id: string): ItemData | undefined {
        return this.items.get(id);
    }

    public getEquipmentData(id: string): EquipmentData | undefined {
        return this.equipments.get(id);
    }

    public getBuffData(id: string): BuffData | undefined {
        return this.buffs.get(id);
    }

    public getMapLayout(floor: number): MapLayout | undefined {
        return this.maps.get(floor);
    }

    public getPlayerData(): PlayerData | null {
        return this.playerData;
    }

    public getLevelData(): LevelData[] {
        return this.levelData;
    }
}

// Export a singleton instance of the data manager
export const dataManager = new DataManager();
