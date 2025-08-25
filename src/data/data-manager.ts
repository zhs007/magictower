import {
    MonsterData,
    ItemData,
    EquipmentData,
    BuffData,
    MapLayout,
    PlayerData,
    LevelData,
} from './types';
import * as fs from 'fs';
import * as path from 'path';

export class DataManager {
    public monsters: Map<string, MonsterData> = new Map();
    public items: Map<string, ItemData> = new Map();
    public equipments: Map<string, EquipmentData> = new Map();
    public buffs: Map<string, BuffData> = new Map();
    public maps: Map<number, MapLayout> = new Map();
    public playerData: PlayerData | null = null;
    public levelData: LevelData[] = [];
    private dataLoaded = false;

    // Helper function to dynamically import JSON files from a directory
    private async loadJsonFromDir(dirPath: string): Promise<any[]> {
        const absolutePath = path.resolve(dirPath);
        if (!fs.existsSync(absolutePath)) {
            console.warn(`Directory not found: ${absolutePath}`);
            return [];
        }
        const files = fs.readdirSync(absolutePath).filter(f => f.endsWith('.json'));
        const modules = [];
        for (const file of files) {
            const filePath = path.join(absolutePath, file);
            // Use a file URL to ensure correct module resolution in different OS
            const fileUrl = 'file://' + filePath;
            try {
                const module = await import(fileUrl, { assert: { type: 'json' } });
                modules.push(module.default);
            } catch (e) {
                // Fallback for environments that don't support import assertions
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                modules.push(JSON.parse(fileContent));
            }
        }
        return modules;
    }


    public async loadAllData(): Promise<void> {
        if (this.dataLoaded) {
            return;
        }

        const monsterData = await this.loadJsonFromDir('gamedata/monsters');
        this.loadDataFromModules(monsterData, this.monsters);

        const itemData = await this.loadJsonFromDir('gamedata/items');
        this.loadDataFromModules(itemData, this.items);

        const equipmentData = await this.loadJsonFromDir('gamedata/equipments');
        this.loadDataFromModules(equipmentData, this.equipments);

        const buffData = await this.loadJsonFromDir('gamedata/buffs');
        this.loadDataFromModules(buffData, this.buffs);

        const mapData = await this.loadJsonFromDir('mapdata');
        for (const map of mapData) {
            this.maps.set(map.floor, map);
        }

        // Load single data files
        const playerDataContent = fs.readFileSync(path.resolve('gamedata/playerdata.json'), 'utf-8');
        this.playerData = JSON.parse(playerDataContent);

        const levelDataContent = fs.readFileSync(path.resolve('gamedata/leveldata.json'), 'utf-8');
        this.levelData = JSON.parse(levelDataContent);

        this.dataLoaded = true;
    }

    private loadDataFromModules(
        dataArray: any[],
        targetMap: Map<string, any>
    ): void {
        for (const data of dataArray) {
            if (data && data.id) {
                targetMap.set(data.id, data);
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
