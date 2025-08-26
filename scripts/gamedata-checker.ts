import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { dataManager } from '../src/data/data-manager.js';
import { PlayerData, LevelData } from '../src/data/types.js';

/**
 * A Node.js implementation of import.meta.glob.
 * This version is simplified to only handle what DataManager needs.
 */
const nodeImportMetaGlob = (pattern: string): Record<string, any> => {
    const result: Record<string, any> = {};
    const rootDir = path.resolve(process.cwd());
    const searchPath = path.join(rootDir, pattern.startsWith('/') ? pattern.substring(1) : pattern);

    const files = glob.sync(searchPath);

    for (const file of files) {
        const relativePath = path.relative(rootDir, file).replace(/\\/g, '/');
        const finalPath = '/' + relativePath;
        const content = fs.readFileSync(file, 'utf-8');
        result[finalPath] = {
            default: JSON.parse(content),
        };
    }

    return result;
};

/**
 * Main function to check game data.
 */
async function checkGameData() {
    console.log('Checking game data...');
    try {
        // Use the Node.js glob implementation to get the module maps
        const monsterModules = nodeImportMetaGlob('/gamedata/monsters/*.json');
        const itemModules = nodeImportMetaGlob('/gamedata/items/*.json');
        const equipmentModules = nodeImportMetaGlob('/gamedata/equipments/*.json');
        const buffModules = nodeImportMetaGlob('/gamedata/buffs/*.json');
        const mapModules = nodeImportMetaGlob('/mapdata/*.json');

        // Process the modules
        dataManager.processModules(monsterModules, itemModules, equipmentModules, buffModules, mapModules);

        // Manually load the single files
        const playerDataPath = path.join(process.cwd(), 'gamedata/playerdata.json');
        const levelDataPath = path.join(process.cwd(), 'gamedata/leveldata.json');

        const playerDataContent = fs.readFileSync(playerDataPath, 'utf-8');
        const levelDataContent = fs.readFileSync(levelDataPath, 'utf-8');

        dataManager.playerData = JSON.parse(playerDataContent) as PlayerData;
        dataManager.levelData = JSON.parse(levelDataContent) as LevelData[];

        console.log('Data loaded successfully!');
        console.log(`- ${dataManager.monsters.size} monsters`);
        console.log(`- ${dataManager.items.size} items`);
        console.log(`- ${dataManager.equipments.size} equipments`);
        console.log(`- ${dataManager.buffs.size} buffs`);
        console.log(`- ${dataManager.maps.size} maps`);

        console.log('Game data check finished.');
    } catch (error) {
        console.error('An error occurred during game data check:', error);
        process.exit(1);
    }
}

// Run the checker
checkGameData();
