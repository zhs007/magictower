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

// #region Helper Functions for Validation
interface CharacterStats {
    maxhp: number;
    attack: number;
    defense: number;
    speed: number;
}

function calculateDamage(attacker: CharacterStats, defender: CharacterStats): number {
    const damage = attacker.attack - defender.defense;
    return damage <= 0 ? 1 : damage;
}

function calculateExp(monster: CharacterStats): number {
    return Math.floor(monster.maxhp / 10) + monster.attack + monster.defense + monster.speed;
}

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}
// #endregion

function validateLevel1And2Balance() {
    console.log('Validating level 1 and 2 balance...');

    // Get player level data
    const playerLvl1 = dataManager.getLevelData().find(l => l.level === 1);
    const playerLvl2 = dataManager.getLevelData().find(l => l.level === 2);

    assert(playerLvl1 !== undefined, 'Player level 1 data not found.');
    assert(playerLvl2 !== undefined, 'Player level 2 data not found.');

    // 1. Player Level 1 Stats Check
    assert(playerLvl1.maxhp === 150, `Lvl 1 maxhp should be 150, but is ${playerLvl1.maxhp}`);
    assert(playerLvl1.attack === 12, `Lvl 1 attack should be 12, but is ${playerLvl1.attack}`);
    assert(playerLvl1.defense === 10, `Lvl 1 defense should be 10, but is ${playerLvl1.defense}`);
    assert(playerLvl1.speed === 10, `Lvl 1 speed should be 10, but is ${playerLvl1.speed}`);

    // 2. Player Level 2 Stats Check
    assert(playerLvl2.exp_needed === 220, `Lvl 2 exp_needed should be 220, but is ${playerLvl2.exp_needed}`);
    assert(playerLvl2.maxhp === 200, `Lvl 2 maxhp should be 200, but is ${playerLvl2.maxhp}`);
    assert(playerLvl2.attack === 17, `Lvl 2 attack should be 17, but is ${playerLvl2.attack}`);
    assert(playerLvl2.defense === 15, `Lvl 2 defense should be 15, but is ${playerLvl2.defense}`);
    assert(playerLvl2.speed === 15, `Lvl 2 speed should be 15, but is ${playerLvl2.speed}`);

    // 3. Monster Stats Check
    const offensive = dataManager.getMonsterData('monster_level1_offensive');
    const average = dataManager.getMonsterData('monster_level1_average');
    const defensive = dataManager.getMonsterData('monster_level1_defensive');

    assert(offensive !== undefined, 'Monster monster_level1_offensive not found.');
    assert(average !== undefined, 'Monster monster_level1_average not found.');
    assert(defensive !== undefined, 'Monster monster_level1_defensive not found.');

    assert(offensive.maxhp === 20 && offensive.attack === 25 && offensive.defense === 2 && offensive.speed === 8, 'monster_level1_offensive stats are incorrect.');
    assert(average.maxhp === 20 && average.attack === 16 && average.defense === 6 && average.speed === 6, 'monster_level1_average stats are incorrect.');
    assert(defensive.maxhp === 30 && defensive.attack === 14 && defensive.defense === 7 && defensive.speed === 4, 'monster_level1_defensive stats are incorrect.');

    // 4. Combat Logic Validation
    const hitsToKillOffensive = Math.ceil(offensive.maxhp / calculateDamage(playerLvl1, offensive));
    assert(hitsToKillOffensive === 2, `Player should kill offensive monster in 2 hits, but it takes ${hitsToKillOffensive}`);

    const hitsToKillAverage = Math.ceil(average.maxhp / calculateDamage(playerLvl1, average));
    assert(hitsToKillAverage === 4, `Player should kill average monster in 4 hits, but it takes ${hitsToKillAverage}`);

    const hitsToKillDefensive = Math.ceil(defensive.maxhp / calculateDamage(playerLvl1, defensive));
    assert(hitsToKillDefensive === 6, `Player should kill defensive monster in 6 hits, but it takes ${hitsToKillDefensive}`);

    // 5. Balancing Assertions
    const dmgFromOffensive = (hitsToKillOffensive - 1) * calculateDamage(offensive, playerLvl1);
    const dmgFromAverage = (hitsToKillAverage - 1) * calculateDamage(average, playerLvl1);
    const dmgFromDefensive = (hitsToKillDefensive - 1) * calculateDamage(defensive, playerLvl1);

    const totalDmg = (2 * dmgFromOffensive) + (3 * dmgFromAverage) + (2 * dmgFromDefensive);
    assert(totalDmg === 124, `Total damage should be 124, but is ${totalDmg}`);

    const expFromOffensive = calculateExp(offensive);
    const expFromAverage = calculateExp(average);
    const expFromDefensive = calculateExp(defensive);

    assert(expFromOffensive === 37, `EXP from offensive monster should be 37, but is ${expFromOffensive}`);
    assert(expFromAverage === 30, `EXP from average monster should be 30, but is ${expFromAverage}`);
    assert(expFromDefensive === 28, `EXP from defensive monster should be 28, but is ${expFromDefensive}`);

    const totalExp = (2 * expFromOffensive) + (3 * expFromAverage) + (2 * expFromDefensive);
    assert(totalExp === 220, `Total EXP should be 220, but is ${totalExp}`);

    // 6. Lvl 2 Player vs Lvl 1 Monsters
    const dmgFromOffensiveLvl2 = calculateDamage(offensive, playerLvl2);
    assert(dmgFromOffensiveLvl2 === 10, `Offensive monster should deal 10 damage to Lvl 2 player, but deals ${dmgFromOffensiveLvl2}`);

    const dmgFromAverageLvl2 = calculateDamage(average, playerLvl2);
    assert(dmgFromAverageLvl2 > 0, `Average monster should deal >0 damage to Lvl 2 player, but deals ${dmgFromAverageLvl2}`);

    const dmgFromDefensiveLvl2 = calculateDamage(defensive, playerLvl2);
    assert(dmgFromDefensiveLvl2 > 0, `Defensive monster should deal >0 damage to Lvl 2 player, but deals ${dmgFromDefensiveLvl2}`);

    // 7. New checks for assetId and id format
    const allMonsters = dataManager.getAllMonsters();
    for (const monster of allMonsters) {
        assert(monster.assetId !== undefined && monster.assetId.length > 0, `Monster ${monster.id} is missing assetId.`);
        assert(monster.id.startsWith('monster_'), `Monster id "${monster.id}" does not follow the "monster_" prefix format.`);
    }

    console.log('Level 1 and 2 balance validation passed successfully!');
}


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

        // Run validation checks
        validateLevel1And2Balance();

        console.log('Game data check finished.');
    } catch (error) {
        console.error('An error occurred during game data check:', error);
        process.exit(1);
    }
}

// Run the checker
checkGameData();
