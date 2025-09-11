import { MonsterData, ItemData, EquipmentData, BuffData, MapLayout, PlayerData } from './types';
import { LevelData } from '@proj-tower/logic-core';

export class DataManager {
    public monsters: Map<string, MonsterData> = new Map();
    public items: Map<string, ItemData> = new Map();
    public equipments: Map<string, EquipmentData> = new Map();
    public buffs: Map<string, BuffData> = new Map();
    public maps: Map<number, MapLayout> = new Map();
    public playerData: PlayerData | null = null;
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

    public async loadAllData(): Promise<void> {
        // This method is now a convenience for the Vite environment.
        // Use relative filesystem globs so vitest (node) can resolve the JSON files
        // during tests. Vite dev server supports repo-root aliases, but vitest
        // resolves imports from the test runner's context; relative paths are
        // more reliable here.
        // From packages/game/src/data, need to go up 4 levels to reach repo root
        // (src -> game -> packages -> repo root). Use four '..' to reach the
        // repository root where `gamedata` and `mapdata` live.
        const monsterModules = import.meta.glob('../../../../gamedata/monsters/*.json', {
            eager: true,
        });
        const itemModules = import.meta.glob('../../../../gamedata/items/*.json', { eager: true });
        const equipmentModules = import.meta.glob('../../../../gamedata/equipments/*.json', {
            eager: true,
        });
        const buffModules = import.meta.glob('../../../../gamedata/buffs/*.json', { eager: true });
        const mapModules = import.meta.glob('../../../../mapdata/*.json', { eager: true });

        this.processModules(monsterModules, itemModules, equipmentModules, buffModules, mapModules);

        // Load single data files
        const playerDataModule = (await import('../../../../gamedata/playerdata.json')).default;
        this.playerData = playerDataModule as PlayerData;

        const levelDataModule = (await import('../../../../gamedata/leveldata.json')).default;
        this.levelData = levelDataModule as LevelData[];
    }

    private loadDataFromModuleGroup(
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

    public getAllMonsters(): MonsterData[] {
        return Array.from(this.monsters.values());
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
