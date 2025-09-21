import { IMonster, IPlayer, LevelData } from '@proj-tower/logic-core';
import { calculateDamage } from '@proj-tower/logic-core';
import fs from 'fs/promises';
import path from 'path';

const MONSTERS_DIR = path.join(process.cwd(), 'gamedata', 'monsters');
const LEVEL_DATA_PATH = path.join(process.cwd(), 'gamedata', 'leveldata.json');

// --- Tool Implementations ---

async function getAllMonsters(): Promise<string> {
    try {
        const files = await fs.readdir(MONSTERS_DIR);
        const monsters = await Promise.all(
            files
                .filter((file) => file.endsWith('.json'))
                .map(async (file) => {
                    const content = await fs.readFile(path.join(MONSTERS_DIR, file), 'utf-8');
                    const data: IMonster = JSON.parse(content);
                    return `- ${data.name} (ID: ${data.id}, Level: ${data.level})`;
                }),
        );
        if (monsters.length === 0) {
            return 'No monsters found.';
        }
        return `Here are the existing monsters:\n${monsters.join('\n')}`;
    } catch (error) {
        console.error('Error in getAllMonsters:', error);
        return 'Error: Could not retrieve the list of monsters.';
    }
}

async function getMonstersInfo(level: number): Promise<string> {
    try {
        const files = await fs.readdir(MONSTERS_DIR);
        const monsters = await Promise.all(
            files
                .filter((file) => file.endsWith('.json'))
                .map(async (file) => {
                    const content = await fs.readFile(path.join(MONSTERS_DIR, file), 'utf-8');
                    const data: IMonster = JSON.parse(content);
                    return data;
                }),
        );

        const filteredMonsters = monsters.filter((m) => m.level === level);

        if (filteredMonsters.length === 0) {
            return `No monsters found at level ${level}.`;
        }

        return JSON.stringify(filteredMonsters, null, 2);
    } catch (error) {
        console.error('Error in getMonstersInfo:', error);
        return `Error: Could not retrieve monster info for level ${level}.`;
    }
}

async function updMonsterInfo(monsterData: IMonster): Promise<string> {
    if (
        !monsterData.id ||
        !monsterData.name ||
        !monsterData.level ||
        !monsterData.maxhp ||
        !monsterData.attack ||
        !monsterData.defense ||
        !monsterData.speed
    ) {
        return 'Error: Missing required monster properties. Please provide id, name, level, maxhp, attack, defense, and speed.';
    }

    const filePath = path.join(MONSTERS_DIR, `${monsterData.id}.json`);
    try {
        await fs.writeFile(filePath, JSON.stringify(monsterData, null, 2));
        return `Successfully saved monster data for "${monsterData.name}" to ${filePath}.`;
    } catch (error) {
        console.error('Error in updMonsterInfo:', error);
        return `Error: Could not save monster data for "${monsterData.name}".`;
    }
}

async function simBattle(
    monsterId: string,
    playerLevel: number,
): Promise<string> {
    try {
        // 1. Load monster data
        const monsterFilePath = path.join(MONSTERS_DIR, `${monsterId}.json`);
        const monsterContent = await fs.readFile(monsterFilePath, 'utf-8');
        const monster: IMonster = JSON.parse(monsterContent);

        // 2. Load player data for the specified level
        const levelDataContent = await fs.readFile(LEVEL_DATA_PATH, 'utf-8');
        const levelData: LevelData[] = JSON.parse(levelDataContent);
        const playerDataForLevel = levelData.find((ld) => ld.level === playerLevel);

        if (!playerDataForLevel) {
            return `Error: Could not find data for player at level ${playerLevel}.`;
        }

        const player: IPlayer = {
            ...playerDataForLevel,
            hp: playerDataForLevel.maxhp,
            exp: 0,
            keys: { yellow: 0 },
            equipment: {},
            backupEquipment: [],
            buffs: [],
            direction: 'right',
            x: 0,
            y: 0,
            id: 'player',
            name: 'Player',
        };

        // 3. Simulate the battle
        let playerHp = player.hp;
        let monsterHp = monster.maxhp;
        let rounds = 0;
        const MAX_ROUNDS = 100; // Safety break

        let attacker: IPlayer | IMonster = player.speed >= monster.speed ? player : monster;
        let defender: IPlayer | IMonster = attacker === player ? monster : player;

        while (playerHp > 0 && monsterHp > 0 && rounds < MAX_ROUNDS) {
            const damage = calculateDamage(attacker, defender);
            if (defender.id === 'player') {
                playerHp -= damage;
            } else {
                monsterHp -= damage;
            }

            // Swap roles
            const temp: IPlayer | IMonster = attacker;
            attacker = defender;
            defender = temp;
            rounds++;
        }

        // 4. Determine results
        const winner = playerHp > 0 ? 'Player' : 'Monster';
        const remainingHp = winner === 'Player' ? playerHp : monsterHp;
        const maxHp = winner === 'Player' ? player.maxhp : monster.maxhp;
        const remainingHpPercent = ((remainingHp / maxHp) * 100).toFixed(2);

        return JSON.stringify({
            winner,
            remainingHp,
            remainingHpPercent: `${remainingHpPercent}%`,
            rounds: Math.ceil(rounds / 2), // Each character attacking is a "round"
        });
    } catch (error) {
        console.error('Error in simBattle:', error);
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
             return `Error: Could not find monster with ID "${monsterId}".`;
        }
        return 'Error: An unexpected error occurred during battle simulation.';
    }
}


// --- Tool Definitions for Gemini ---

export const tools = [
    {
        functionDeclarations: [
            {
                name: 'getAllMonsters',
                description: 'Get a list of all existing monsters, including their names, IDs, and levels.',
            },
            {
                name: 'getMonstersInfo',
                description: 'Get detailed attribute data for all monsters at a specific level.',
                parameters: {
                    type: 'OBJECT',
                    properties: {
                        level: { type: 'NUMBER' },
                    },
                    required: ['level'],
                },
            },
            {
                name: 'updMonsterInfo',
                description: 'Create a new monster or update an existing one. The monster data must be a complete JSON object.',
                parameters: {
                    type: 'OBJECT',
                    properties: {
                        monsterData: {
                            type: 'OBJECT',
                            properties: {
                                id: { type: 'STRING', description: "Unique identifier, e.g., 'level5_bat_a'" },
                                name: { type: 'STRING', description: "Display name, e.g., 'Giant Bat'" },
                                level: { type: 'NUMBER' },
                                maxhp: { type: 'NUMBER' },
                                attack: { type: 'NUMBER' },
                                defense: { type: 'NUMBER' },
                                speed: { type: 'NUMBER' },
                                assetId: { type: 'STRING', description: "Asset key for the monster's image, e.g., 'monster_monster'" }
                            },
                            required: ['id', 'name', 'level', 'maxhp', 'attack', 'defense', 'speed']
                        },
                    },
                    required: ['monsterData'],
                },
            },
            {
                name: 'simBattle',
                description: 'Simulate a battle between a specific monster and a player of a given level.',
                parameters: {
                    type: 'OBJECT',
                    properties: {
                        monsterId: { type: 'STRING', description: "The ID of the monster to simulate against." },
                        playerLevel: { type: 'NUMBER', description: "The level of the player for the simulation." },
                    },
                    required: ['monsterId', 'playerLevel'],
                },
            },
        ],
    },
];


export const toolFunctions = {
    getAllMonsters,
    getMonstersInfo,
    updMonsterInfo,
    simBattle,
};
