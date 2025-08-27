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

    if (playerLvl1 && playerLvl2) {
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
        assert(playerLvl2.speed === 12, `Lvl 2 speed should be 12, but is ${playerLvl2.speed}`);

        // 3. Monster Stats Check
        const offensive = dataManager.getMonsterData('monster_level1_offensive');
        const average = dataManager.getMonsterData('monster_level1_average');
        const defensive = dataManager.getMonsterData('monster_level1_defensive');

        assert(offensive !== undefined, 'Monster monster_level1_offensive not found.');
        assert(average !== undefined, 'Monster monster_level1_average not found.');
        assert(defensive !== undefined, 'Monster monster_level1_defensive not found.');

        if (offensive && average && defensive) {
            assert(offensive.maxhp === 20 && offensive.attack === 25 && offensive.defense === 2 && offensive.speed === 8, 'monster_level1_offensive stats are incorrect.');
            assert(average.maxhp === 20 && average.attack === 16 && average.defense === 3 && average.speed === 6, 'monster_level1_average stats are incorrect.');
            assert(defensive.maxhp === 30 && defensive.attack === 14 && defensive.defense === 7 && defensive.speed === 4, 'monster_level1_defensive stats are incorrect.');

            // 4. Combat Logic Validation
            const hitsToKillOffensive = Math.ceil(offensive.maxhp / calculateDamage(playerLvl1, offensive));
            assert(hitsToKillOffensive === 2, `Player should kill offensive monster in 2 hits, but it takes ${hitsToKillOffensive}`);

            const hitsToKillAverage = Math.ceil(average.maxhp / calculateDamage(playerLvl1, average));
            assert(hitsToKillAverage === 3, `Player should kill average monster in 3 hits, but it takes ${hitsToKillAverage}`);

            const hitsToKillDefensive = Math.ceil(defensive.maxhp / calculateDamage(playerLvl1, defensive));
            assert(hitsToKillDefensive === 6, `Player should kill defensive monster in 6 hits, but it takes ${hitsToKillDefensive}`);

            // 5. Balancing Assertions
            const dmgFromOffensive = (hitsToKillOffensive - 1) * calculateDamage(offensive, playerLvl1);
            const dmgFromAverage = (hitsToKillAverage - 1) * calculateDamage(average, playerLvl1);
            const dmgFromDefensive = (hitsToKillDefensive - 1) * calculateDamage(defensive, playerLvl1);

            const totalDmg = (2 * dmgFromOffensive) + (3 * dmgFromAverage) + (2 * dmgFromDefensive);
            assert(totalDmg === 106, `Total damage should be 106, but is ${totalDmg}`);

            const expFromOffensive = calculateExp(offensive);
            const expFromAverage = calculateExp(average);
            const expFromDefensive = calculateExp(defensive);

            assert(expFromOffensive === 37, `EXP from offensive monster should be 37, but is ${expFromOffensive}`);
            assert(expFromAverage === 27, `EXP from average monster should be 27, but is ${expFromAverage}`);
            assert(expFromDefensive === 28, `EXP from defensive monster should be 28, but is ${expFromDefensive}`);

            const totalExp = (2 * expFromOffensive) + (3 * expFromAverage) + (2 * expFromDefensive);
            assert(totalExp === 211, `Total EXP should be 211, but is ${totalExp}`);

            // 6. Lvl 2 Player vs Lvl 1 Monsters
            const dmgFromOffensiveLvl2 = calculateDamage(offensive, playerLvl2);
            assert(dmgFromOffensiveLvl2 === 10, `Offensive monster should deal 10 damage to Lvl 2 player, but deals ${dmgFromOffensiveLvl2}`);

            const dmgFromAverageLvl2 = calculateDamage(average, playerLvl2);
            assert(dmgFromAverageLvl2 > 0, `Average monster should deal >0 damage to Lvl 2 player, but deals ${dmgFromAverageLvl2}`);

            const dmgFromDefensiveLvl2 = calculateDamage(defensive, playerLvl2);
            assert(dmgFromDefensiveLvl2 > 0, `Defensive monster should deal >0 damage to Lvl 2 player, but deals ${dmgFromDefensiveLvl2}`);
        }
    }

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
export async function checkGameData() {
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
        validateLevel2To3Balance();

        console.log('Game data check finished.');
    } catch (error) {
        console.error('An error occurred during game data check:', error);
        process.exit(1);
    }
}

function validateLevel2To3Balance() {
    console.log('Validating level 2 to 3 balance...');

    const playerLvl2 = dataManager.getLevelData().find(l => l.level === 2)!;
    const playerLvl3 = dataManager.getLevelData().find(l => l.level === 3)!;
    const ironSword = dataManager.getEquipmentData('iron_sword')!;
    const mantis = dataManager.getMonsterData('monster_level2_speed')!;
    const goblin = dataManager.getMonsterData('monster_level2_power')!;
    const slime = dataManager.getMonsterData('monster_level2_normal')!;
    const l1_avg = dataManager.getMonsterData('monster_level1_average')!;
    const l1_def = dataManager.getMonsterData('monster_level1_defensive')!;
    const l1_off = dataManager.getMonsterData('monster_level1_offensive')!;

    // 1. HP is multiple of 10
    const allMonsters = dataManager.getAllMonsters();
    for (const monster of allMonsters) {
        assert(monster.maxhp % 10 === 0, `Monster ${monster.id} maxhp is not a multiple of 10.`);
    }
    for (const level of dataManager.getLevelData()) {
        assert(level.maxhp % 10 === 0, `Player L${level.level} maxhp is not a multiple of 10.`);
    }

    // 2. L2 Player (with sword) vs L2 Monsters
    const playerLvl2WithSword = {
        ...playerLvl2,
        attack: playerLvl2.attack + ironSword.stat_mods.attack!,
    };

    const dmgFromMantis = calculateDamage(mantis, playerLvl2WithSword);
    const dmgFromGoblin = calculateDamage(goblin, playerLvl2WithSword);
    const dmgFromSlime = calculateDamage(slime, playerLvl2WithSword);

    assert(dmgFromMantis >= 10, `Mantis damage to L2 player should be >= 10, but is ${dmgFromMantis}`);
    assert(dmgFromGoblin >= 10, `Goblin damage to L2 player should be >= 10, but is ${dmgFromGoblin}`);
    assert(dmgFromSlime >= 10, `Slime damage to L2 player should be >= 10, but is ${dmgFromSlime}`);
    assert(dmgFromMantis > dmgFromGoblin && dmgFromGoblin > dmgFromSlime, 'L2 monster damage order is incorrect.');

    const hitsToKillMantis = Math.ceil(mantis.maxhp / calculateDamage(playerLvl2WithSword, mantis));
    const hitsToKillGoblin = Math.ceil(goblin.maxhp / calculateDamage(playerLvl2WithSword, goblin));
    const hitsToKillSlime = Math.ceil(slime.maxhp / calculateDamage(playerLvl2WithSword, slime));

    assert(hitsToKillMantis === 2, `L2 Player should kill Mantis in 2 hits, but it takes ${hitsToKillMantis}`);
    assert(hitsToKillGoblin === 3, `L2 Player should kill Goblin in 3 hits, but it takes ${hitsToKillGoblin}`);
    assert(hitsToKillSlime === 4, `L2 Player should kill Slime in 4 hits, but it takes ${hitsToKillSlime}`);

    // 3. L3 Player vs L2 Monsters
    const playerLvl3WithSword = {
        ...playerLvl3,
        attack: playerLvl3.attack + ironSword.stat_mods.attack!,
    };
    assert(playerLvl3.speed > mantis.speed, `L3 Player speed (${playerLvl3.speed}) should be greater than Mantis speed (${mantis.speed})`);

    const l3HitsToKillMantis = Math.ceil(mantis.maxhp / calculateDamage(playerLvl3WithSword, mantis));
    assert(l3HitsToKillMantis === 2, `L3 Player should kill Mantis in 2 hits, but it takes ${l3HitsToKillMantis}`);
    // Player is faster, so Mantis attacks once.

    const l3HitsToKillGoblin = Math.ceil(goblin.maxhp / calculateDamage(playerLvl3WithSword, goblin));
    assert(l3HitsToKillGoblin === 3, `L3 Player should kill Goblin in 3 hits, but it takes ${l3HitsToKillGoblin}`);
    // Player is faster, so Goblin attacks twice.

    const dmgFromMantisToL3 = calculateDamage(mantis, playerLvl3WithSword);
    const dmgFromGoblinToL3 = calculateDamage(goblin, playerLvl3WithSword);
    assert(dmgFromMantisToL3 >= 10, `Mantis damage to L3 player should be >= 10, but is ${dmgFromMantisToL3}`);
    assert(dmgFromGoblinToL3 >= 10, `Goblin damage to L3 player should be >= 10, but is ${dmgFromGoblinToL3}`);

    // 4. Level-up EXP check
    const expFromFloor2 = 2 * calculateExp(mantis) + 2 * calculateExp(goblin) + 2 * calculateExp(slime) + calculateExp(l1_avg) + calculateExp(l1_def) + calculateExp(l1_off);
    const neededExp = playerLvl3.exp_needed - playerLvl2.exp_needed;
    assert(expFromFloor2 >= neededExp, `Total EXP from floor 2 (${expFromFloor2}) is not enough to level up. Need ${neededExp}`);

    // 5. Total Damage on Floor 2 Check
    // Mantis attacks twice (is faster). Goblins attack twice. Slimes attack three times.
    const totalDmgFromL2 = 2 * (hitsToKillMantis) * dmgFromMantis + 2 * (hitsToKillGoblin - 1) * dmgFromGoblin + 2 * (hitsToKillSlime - 1) * dmgFromSlime;
    // L1 monsters vs L2 player with sword
    const hitsToKillL1Off = Math.ceil(l1_off.maxhp / calculateDamage(playerLvl2WithSword, l1_off));
    const hitsToKillL1Avg = Math.ceil(l1_avg.maxhp / calculateDamage(playerLvl2WithSword, l1_avg));
    const hitsToKillL1Def = Math.ceil(l1_def.maxhp / calculateDamage(playerLvl2WithSword, l1_def));
    const totalDmgFromL1 = (hitsToKillL1Off -1) * calculateDamage(l1_off, playerLvl2WithSword) + (hitsToKillL1Avg - 1) * calculateDamage(l1_avg, playerLvl2WithSword) + (hitsToKillL1Def - 1) * calculateDamage(l1_def, playerLvl2WithSword);

    const totalDmgOnFloor = totalDmgFromL1 + totalDmgFromL2;
    assert(totalDmgOnFloor > playerLvl2.maxhp * 1.5, `Total potential damage on floor 2 (${totalDmgOnFloor}) is not significant enough compared to player HP (${playerLvl2.maxhp}). Should be > ${playerLvl2.maxhp * 1.5}`);

    console.log('Level 2 to 3 balance validation passed successfully!');
}
