import { IMonster, IPlayer, LevelData } from '@proj-tower/logic-core';
import { calculateDamage } from '@proj-tower/logic-core';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { generateImage } from './doubao-client.js';
import { removeBackground } from './rmbg-client.js';
import { resolveProjectPath } from '../config/env';

// Always resolve paths from the repo root to avoid cwd issues when running dev/build
const MONSTERS_DIR = resolveProjectPath('gamedata', 'monsters');
const MONSTER_ASSETS_DIR = resolveProjectPath('assets', 'monster');
const MONSTER_PUBLISH_DIR = resolveProjectPath('monstereditorpublish');
const LEVEL_DATA_PATH = resolveProjectPath('gamedata', 'leveldata.json');

// Ensure the publish directory exists when needed

function logDebug(meta: Record<string, unknown>, msg: string) {
    try {
        // eslint-disable-next-line no-console
        console.debug('[agent-tools]', msg, meta);
    } catch (_) {}
}

// --- Tool Implementations ---

async function getAllMonsters(): Promise<string> {
    try {
        logDebug({}, 'getAllMonsters: start');
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
            logDebug({ monsters: 0 }, 'getAllMonsters: done');
            return 'No monsters found.';
        }
        const out = `Here are the existing monsters:\n${monsters.join('\n')}`;
        logDebug({ monsters: monsters.length, outLen: out.length }, 'getAllMonsters: done');
        return out;
    } catch (error) {
        console.error('Error in getAllMonsters:', error);
        return 'Error: Could not retrieve the list of monsters.';
    }
}

async function getMonstersInfo(level: number): Promise<string> {
    try {
        logDebug({ level }, 'getMonstersInfo: start');
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
            logDebug({ level, count: 0 }, 'getMonstersInfo: done');
            return `No monsters found at level ${level}.`;
        }
        const out = JSON.stringify(filteredMonsters, null, 2);
        logDebug({ level, count: filteredMonsters.length, outLen: out.length }, 'getMonstersInfo: done');
        return out;
    } catch (error) {
        console.error('Error in getMonstersInfo:', error);
        return `Error: Could not retrieve monster info for level ${level}.`;
    }
}

async function updMonsterInfo(monsterData: IMonster): Promise<string> {
    logDebug({ id: monsterData?.id, name: monsterData?.name }, 'updMonsterInfo: start');
    if (
        !monsterData.id ||
        !monsterData.name ||
        !monsterData.level ||
        !monsterData.maxhp ||
        !monsterData.attack ||
        !monsterData.defense ||
        !monsterData.speed
    ) {
        logDebug({}, 'updMonsterInfo: validation failed');
        return 'Error: Missing required monster properties. Please provide id, name, level, maxhp, attack, defense, and speed.';
    }

    const filePath = path.join(MONSTERS_DIR, `${monsterData.id}.json`);
    try {
        await fs.writeFile(filePath, JSON.stringify(monsterData, null, 2));
        const out = `Successfully saved monster data for "${monsterData.name}" to ${filePath}.`;
        logDebug({ id: monsterData.id, outLen: out.length }, 'updMonsterInfo: done');
        return out;
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
        logDebug({ monsterId, playerLevel }, 'simBattle: start');
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

        const out = JSON.stringify({
            winner,
            remainingHp,
            remainingHpPercent: `${remainingHpPercent}%`,
            rounds: Math.ceil(rounds / 2), // Each character attacking is a "round"
        });
        logDebug({ monsterId, playerLevel, outLen: out.length }, 'simBattle: done');
        return out;
    } catch (error) {
        console.error('Error in simBattle:', error);
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
             return `Error: Could not find monster with ID "${monsterId}".`;
        }
        return 'Error: An unexpected error occurred during battle simulation.';
    }
}

async function genDoubaoImage(prompt: string): Promise<string> {
    try {
        logDebug({ prompt }, 'genDoubaoImage: start');
        const images = await generateImage(prompt);
        if (!images || images.length === 0) {
            return 'Error: The image generation service did not return any images.';
        }

        const imageBuffer = images[0];
        const hash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
        const filename = `${hash}.png`;
        const filePath = path.join(MONSTER_PUBLISH_DIR, filename);

        // Create publish directory if it doesn't exist
        await fs.mkdir(MONSTER_PUBLISH_DIR, { recursive: true });
        await fs.writeFile(filePath, imageBuffer);

        const imageUrl = `/public/${filename}`;
        logDebug({ prompt, imageUrl }, 'genDoubaoImage: done');
        return `Generated image successfully. You can view it here: ${imageUrl}`;
    } catch (error) {
        console.error('Error in genDoubaoImage:', error);
        return 'Error: Failed to generate monster image.';
    }
}

async function saveMonsterImage(assetId: string, imageUrl: string): Promise<string> {
    try {
        logDebug({ assetId, imageUrl }, 'saveMonsterImage: start');
        if (!imageUrl.startsWith('/public/')) {
            return 'Error: Invalid image URL. It must be a local URL starting with /public/';
        }
        const filename = path.basename(imageUrl);
        const sourcePath = path.join(MONSTER_PUBLISH_DIR, filename);
        const destPath = path.join(MONSTER_ASSETS_DIR, `${assetId}.png`);

        await fs.mkdir(MONSTER_ASSETS_DIR, { recursive: true });
        await fs.mkdir(MONSTER_PUBLISH_DIR, { recursive: true });

        const TILE_WIDTH = 65;
        // Trim transparent padding, then clamp width to the tile size without enlarging slim sprites.
        const { data: trimmedBuffer } = await sharp(sourcePath)
            .trim()
            .png()
            .toBuffer({ resolveWithObject: true });

        const { data: finalBuffer } = await sharp(trimmedBuffer)
            .resize({ width: TILE_WIDTH, fit: 'inside', withoutEnlargement: true })
            .png()
            .toBuffer({ resolveWithObject: true });

        const publishAssetPath = path.join(MONSTER_PUBLISH_DIR, `${assetId}.png`);

        await Promise.all([
            fs.writeFile(destPath, finalBuffer),
            fs.writeFile(publishAssetPath, finalBuffer),
        ]);

        const out = `Successfully saved image for asset ID "${assetId}" to ${destPath}.`;
        logDebug({ assetId, imageUrl, outLen: out.length }, 'saveMonsterImage: done');
        return out;
    } catch (error) {
        console.error('Error in saveMonsterImage:', error);
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            return `Error: Could not find the source image at ${imageUrl}. Make sure genDoubaoImage was called successfully first.`;
        }
        return `Error: Could not save image for asset ID "${assetId}".`;
    }
}

async function rmbg(imageUrl: string): Promise<string> {
    try {
        logDebug({ imageUrl }, 'rmbg: start');
        if (!imageUrl.startsWith('/public/')) {
            return 'Error: Invalid image URL. It must be a local URL starting with /public/';
        }
        const filename = path.basename(imageUrl);
        const sourcePath = path.join(MONSTER_PUBLISH_DIR, filename);

        const imageBuffer = await fs.readFile(sourcePath);

        const processedImageBuffer = await removeBackground(imageBuffer);

        const hash = crypto.createHash('sha256').update(processedImageBuffer).digest('hex');
        const newFilename = `${hash}.png`;
        const newFilePath = path.join(MONSTER_PUBLISH_DIR, newFilename);

        await fs.writeFile(newFilePath, processedImageBuffer);

        const newImageUrl = `/public/${newFilename}`;
        logDebug({ imageUrl, newImageUrl }, 'rmbg: done');
        return `Background removed successfully. You can view the new image here: ${newImageUrl}`;
    } catch (error) {
        console.error('Error in rmbg:', error);
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            return `Error: Could not find the source image at ${imageUrl}. Make sure genDoubaoImage was called successfully first.`;
        }
        return 'Error: Failed to remove background from image.';
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
                    type: 'object',
                    properties: {
                        level: { type: 'number' },
                    },
                    required: ['level'],
                },
            },
            {
                name: 'updMonsterInfo',
                description: 'Create a new monster or update an existing one. The monster data must be a complete JSON object.',
                parameters: {
                    type: 'object',
                    properties: {
                        monsterData: {
                            type: 'object',
                            properties: {
                                id: { type: 'string', description: "Unique identifier, e.g., 'level5_bat_a'" },
                                name: { type: 'string', description: "Display name, e.g., 'Giant Bat'" },
                                level: { type: 'number' },
                                maxhp: { type: 'number' },
                                attack: { type: 'number' },
                                defense: { type: 'number' },
                                speed: { type: 'number' },
                                assetId: { type: 'string', description: "Asset key for the monster's image, e.g., 'monster_monster'" }
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
                    type: 'object',
                    properties: {
                        monsterId: { type: 'string', description: "The ID of the monster to simulate against." },
                        playerLevel: { type: 'number', description: "The level of the player for the simulation." },
                    },
                    required: ['monsterId', 'playerLevel'],
                },
            },
            {
                name: 'genDoubaoImage',
                description: 'Generate a new image for a monster based on a descriptive prompt.',
                parameters: {
                    type: 'object',
                    properties: {
                        prompt: { type: 'string', description: "A detailed text description of the desired monster image." },
                    },
                    required: ['prompt'],
                },
            },
            {
                name: 'rmbg',
                description: 'Remove the background from a previously generated image. This should be called after the user is satisfied with the image content but before saving it permanently.',
                parameters: {
                    type: 'object',
                    properties: {
                        imageUrl: { type: 'string', description: "The URL of the image to process, as returned by genDoubaoImage." },
                    },
                    required: ['imageUrl'],
                },
            },
            {
                name: 'saveMonsterImage',
                description: "Save a previously generated image to the monster assets directory. This should be called when the user is satisfied with a generated image.",
                parameters: {
                    type: 'object',
                    properties: {
                        assetId: { type: 'string', description: "The asset ID for the monster, which will be used as the filename (e.g., 'level5_bat_a'). This should match the monster's 'id'." },
                        imageUrl: { type: 'string', description: "The URL of the image to save, as returned by genDoubaoImage." },
                    },
                    required: ['assetId', 'imageUrl'],
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
    genDoubaoImage,
    rmbg,
    saveMonsterImage,
};
