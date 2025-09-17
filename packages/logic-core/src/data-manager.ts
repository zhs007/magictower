import { IMonster, IItem, IEquipment, IBuff, IPlayer, LevelData, MapLayout } from './types';
import { getLogger } from './logger';

export class DataManager {
    public monsters: Map<string, IMonster> = new Map();
    public items: Map<string, IItem> = new Map();
    public equipments: Map<string, IEquipment> = new Map();
    public buffs: Map<string, IBuff> = new Map();
    public maps: Map<number, MapLayout> = new Map();
    public playerData: IPlayer | null = null;
    public levelData: LevelData[] = [];

    public processModules(
        monsterModules: Record<string, any>,
        itemModules: Record<string, any>,
        equipmentModules: Record<string, any>,
        buffModules: Record<string, any>,
        mapModules: Record<string, any>
    ): void {
        this.loadDataFromModuleGroup(monsterModules, this.monsters);
        this.loadDataFromModuleGroup(itemModules, this.items);
        this.loadDataFromModuleGroup(equipmentModules, this.equipments);
        this.loadDataFromModuleGroup(buffModules, this.buffs);

        for (const path in mapModules) {
            const mapData = (mapModules[path] as any).default as MapLayout;
            this.maps.set(mapData.floor, mapData);
        }
    }

    /**
     * Load all game data.
     *
     * By default this loads JSON files from the repository root using
     * `import.meta.glob` and dynamic imports. For tests it's often desirable
     * to inject (override) the loaded data to avoid relying on module id
     * normalization or runtime aliasing. Pass an `overrides` object to
     * inject data directly.
     *
     * Example (from a test):
     * await dataManager.loadAllData({
     *   playerData: { id: 'player', name: 'Test', ... },
     *   levelData: [{ level: 1, exp_needed: 0, ... }]
     * });
     *
     * Overrides fields:
     * - monsters: Record<string, any> (module-like records)
     * - items, equipments, buffs, maps: same shape as produced by import.meta.glob
     * - playerData: IPlayer
     * - levelData: LevelData[]
     */
    public async loadAllData(overrides?: {
        monsters?: Record<string, any>;
        items?: Record<string, any>;
        equipments?: Record<string, any>;
        buffs?: Record<string, any>;
        maps?: Record<string, any>;
        playerData?: IPlayer;
        levelData?: LevelData[];
    }): Promise<void> {
        // Reset previous data to support repeated calls in tests
        this.monsters.clear();
        this.items.clear();
        this.equipments.clear();
        this.buffs.clear();
        this.maps.clear();
        this.playerData = null;
        this.levelData = [];

        // If modules are provided via overrides, use them; otherwise load from
        // filesystem via import.meta.glob / dynamic import.
        const monsterModules =
            overrides?.monsters ??
            import.meta.glob('../../../gamedata/monsters/*.json', { eager: true });
        const itemModules =
            overrides?.items ??
            import.meta.glob('../../../gamedata/items/*.json', { eager: true });
        const equipmentModules =
            overrides?.equipments ??
            import.meta.glob('../../../gamedata/equipments/*.json', { eager: true });
        const buffModules =
            overrides?.buffs ??
            import.meta.glob('../../../gamedata/buffs/*.json', { eager: true });
        const mapModules =
            overrides?.maps ?? import.meta.glob('../../../mapdata/*.json', { eager: true });

        this.processModules(monsterModules, itemModules, equipmentModules, buffModules, mapModules);

        if (overrides?.playerData) {
            this.playerData = overrides.playerData;
        } else {
            const playerDataModule = (await import('../../../gamedata/playerdata.json')).default;
            this.playerData = playerDataModule as IPlayer;
        }

        if (overrides?.levelData) {
            this.levelData = overrides.levelData;
        } else {
            const levelDataModule = (await import('../../../gamedata/leveldata.json')).default;
            this.levelData = levelDataModule as LevelData[];
        }
    }

    private loadDataFromModuleGroup(
        modules: Record<string, unknown>,
        targetMap: Map<string, any>
    ): void {
        const logger = getLogger();
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
                    logger.warn(`Failed to create fallback registration for ${path}:`, e);
                }
            } else {
                logger.warn(
                    `[DataManager] Failed to load data from module at path: ${path}. Missing 'id' or data is malformed.`,
                    data
                );
            }
        }
    }

    public getMonsterData(id: string): IMonster | undefined {
        return this.monsters.get(id);
    }

    public getAllMonsters(): IMonster[] {
        return Array.from(this.monsters.values());
    }

    public getItemData(id: string): IItem | undefined {
        return this.items.get(id);
    }

    public getEquipmentData(id: string): IEquipment | undefined {
        return this.equipments.get(id);
    }

    public getBuffData(id: string): IBuff | undefined {
        return this.buffs.get(id);
    }

    public getMapLayout(floor: number): MapLayout | undefined {
        return this.maps.get(floor);
    }

    public getPlayerData(): IPlayer | null {
        return this.playerData;
    }

    public getLevelData(): LevelData[] {
        return this.levelData;
    }
}

// Export a singleton instance of the data manager
export const dataManager = new DataManager();
