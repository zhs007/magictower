import { Application, Assets, Texture } from 'pixi.js';
import { MapRender } from '@proj-tower/maprender';
import { CharacterEntity } from '@proj-tower/maprender';
import { GameState, IPlayer, IMonster, ITileAsset, ICharacter } from '@proj-tower/logic-core';

import { initAgentChat } from './agent';

// --- Type Definitions ---
interface LevelData {
    level: number;
    exp_needed: number;
    maxhp: number;
    attack: number;
    defense: number;
    speed: number;
}

interface BattleResult {
    winner: 'player' | 'monster';
    firstAttacker: 'player' | 'monster';
    turns: number;
    playerHpLeft: number;
    monsterHpLeft: number;
    playerHpLostPercent: number;
    monsterHpLostPercent: number;
}

type MonsterRecord = IMonster & { assetId?: string };

const monsterAssetImports = import.meta.glob('../../../../assets/monster/*.png', {
    eager: true,
    as: 'url',
}) as Record<string, string>;

const MONSTER_TEXTURE_URLS: Record<string, string> = Object.entries(monsterAssetImports).reduce(
    (acc, [path, url]) => {
        const match = /([^/]+)\.png$/i.exec(path);
        if (match) {
            acc[match[1]] = url;
        }
        return acc;
    },
    {} as Record<string, string>
);

const FALLBACK_MONSTER_ASSET_ID = 'monster';

// --- DOM Element References ---
const playerConfigBtn = document.getElementById('player-config-btn') as HTMLButtonElement;
const modal = document.getElementById('player-config-modal') as HTMLDivElement;
const closeModalBtn = document.getElementById('modal-close-btn') as HTMLSpanElement;
const playerLevelSelect = document.getElementById('player-level-select') as HTMLSelectElement;
const monsterLevelSelect = document.getElementById('monster-level-select') as HTMLSelectElement;
const monsterSelect = document.getElementById('monster-select') as HTMLSelectElement;
const playerStatsDisplay = document.getElementById('player-stats-display') as HTMLDivElement;
const monsterStatsDisplay = document.getElementById('monster-stats-display') as HTMLDivElement;
const simulationArea = document.getElementById('simulation-area') as HTMLDivElement;
const zoomInBtn = document.getElementById('zoom-in') as HTMLButtonElement;
const zoomOutBtn = document.getElementById('zoom-out') as HTMLButtonElement;
const zoomDisplay = document.getElementById('zoom-display') as HTMLSpanElement;

// --- Agent Chat Setup ---
initAgentChat();

// --- State ---
let allMonsters: MonsterRecord[] = [];
let levelData: LevelData[] = [];
let selectedPlayer: IPlayer | null = null;
let selectedMonster: MonsterRecord | null = null;
let mapRender: MapRender | null = null;
let playerEntity: CharacterEntity | null = null;
let monsterEntity: CharacterEntity | null = null;
const zoomLevels = [0.5, 0.75, 1, 1.25, 1.5, 2];
let currentZoomIndex = 2; // 100%
const TILE_SIZE = 65;
let pixiCanvas: HTMLCanvasElement | null = null;
let battleInProgress = false;

// --- Modal Logic ---
playerConfigBtn.onclick = () => {
    modal.style.display = 'block';
};
closeModalBtn.onclick = () => {
    modal.style.display = 'none';
};
window.onclick = (event) => {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
};

// --- Data Fetching and Population ---

async function fetchLevelData() {
    try {
        const response = await fetch('/api/leveldata');
        if (!response.ok) throw new Error('Failed to fetch level data');
        levelData = await response.json();
        populateLevelSelect(playerLevelSelect, levelData);
        populateLevelSelect(monsterLevelSelect, levelData);
    } catch (error) {
        console.error(error);
        playerLevelSelect.innerHTML = '<option>Error</option>';
        monsterLevelSelect.innerHTML = '<option>Error</option>';
    }
}

async function fetchAllMonsters() {
    try {
        const response = await fetch('/api/monsters');
        if (!response.ok) throw new Error('Failed to fetch monster list');
        const monsterIds: string[] = await response.json();
        const monsterPromises = monsterIds.map((id) =>
            fetch(`/api/monsters/${id}`).then((res) => res.json() as Promise<MonsterRecord>)
        );
        allMonsters = await Promise.all(monsterPromises);
    } catch (error) {
        console.error(error);
        monsterSelect.innerHTML = '<option>Error</option>';
    }
}

function populateLevelSelect(selectElement: HTMLSelectElement, data: LevelData[]) {
    selectElement.innerHTML = '<option value="">Select level</option>';
    data.forEach((levelInfo) => {
        const option = document.createElement('option');
        option.value = levelInfo.level.toString();
        option.textContent = `Level ${levelInfo.level}`;
        selectElement.appendChild(option);
    });
}

function updateMonsterDropdown() {
    const selectedLevel = parseInt(monsterLevelSelect.value, 10);
    monsterSelect.innerHTML = '<option value="">Select monster</option>';
    selectedMonster = null;
    renderMonsterStats();
    if (!isNaN(selectedLevel)) {
        const filteredMonsters = allMonsters.filter((m) => m.level === selectedLevel);
        if (filteredMonsters.length === 0) {
            monsterSelect.innerHTML = '<option>None</option>';
            return;
        }
        filteredMonsters.forEach((monster) => {
            const option = document.createElement('option');
            option.value = monster.id;
            option.textContent = monster.name;
            monsterSelect.appendChild(option);
        });
    }
}

function renderPlayerStats(currentHp?: number) {
    if (!selectedPlayer) {
        playerStatsDisplay.innerHTML = 'Select a level.';
        if (playerEntity) {
            playerEntity.visible = false;
        }
        return;
    }

    const hp = Math.max(0, Math.min(selectedPlayer.maxhp, currentHp ?? selectedPlayer.maxhp));

    playerStatsDisplay.innerHTML = `
        <b>Player (Lvl ${selectedPlayer.level})</b><br/>
        HP: ${hp} / ${selectedPlayer.maxhp}<br/>
        ATK: ${selectedPlayer.attack}<br/>
        DEF: ${selectedPlayer.defense}<br/>
        SPD: ${selectedPlayer.speed}
    `;

    if (playerEntity) {
        playerEntity.visible = true;
        playerEntity.setDirection('right');
    }
}

function renderMonsterStats(currentHp?: number) {
    if (!selectedMonster) {
        monsterStatsDisplay.innerHTML = 'Select a monster.';
        if (monsterEntity) {
            monsterEntity.visible = false;
        }
        return;
    }

    const hp = Math.max(0, Math.min(selectedMonster.maxhp, currentHp ?? selectedMonster.maxhp));

    monsterStatsDisplay.innerHTML = `
        <b>${selectedMonster.name} (Lvl ${selectedMonster.level})</b><br/>
        HP: ${hp} / ${selectedMonster.maxhp}<br/>
        ATK: ${selectedMonster.attack}<br/>
        DEF: ${selectedMonster.defense}<br/>
        SPD: ${selectedMonster.speed}
    `;

    if (monsterEntity) {
        monsterEntity.visible = true;
        monsterEntity.setDirection('left');
    }
}

function updatePlayerStatsDisplay() {
    const level = parseInt(playerLevelSelect.value, 10);
    const stats = levelData.find((l) => l.level === level);
    if (stats) {
        selectedPlayer = {
            ...stats,
            id: 'player',
            hp: stats.maxhp,
            name: 'Player',
            x: 7,
            y: 8,
            direction: 'right',
            equipment: {},
            backupEquipment: [],
            keys: { yellow: 0 },
            buffs: [],
            exp: 0,
            hasMonsterManual: false,
            specialItems: [],
        };
        renderPlayerStats();
    } else {
        selectedPlayer = null;
        renderPlayerStats();
    }
}

async function ensureMonsterTexture(assetId?: string): Promise<Texture> {
    const normalizedId = assetId && MONSTER_TEXTURE_URLS[assetId] ? assetId : FALLBACK_MONSTER_ASSET_ID;
    if (assetId && normalizedId !== assetId) {
        console.warn(
            `[monster-editor] Missing monster asset "${assetId}" – falling back to "${FALLBACK_MONSTER_ASSET_ID}".`
        );
    }
    const src = MONSTER_TEXTURE_URLS[normalizedId];
    if (!src) {
        return Texture.EMPTY;
    }
    const alias = `monster_asset:${normalizedId}`;
    if (!Assets.cache.has(alias)) {
        await Assets.load({ alias, src });
    }
    return (Assets.cache.get(alias) as Texture) ?? Texture.EMPTY;
}

async function applyMonsterTexture(monster: MonsterRecord | null): Promise<void> {
    if (!monsterEntity) {
        return;
    }
    const texture = await ensureMonsterTexture(monster?.assetId);
    if (monster !== selectedMonster) {
        // Selection changed while the texture was loading; skip applying the stale texture.
        return;
    }
    monsterEntity.sprite.texture = texture;
}

async function updateMonsterStatsDisplay() {
    const monsterId = monsterSelect.value;
    const monster = allMonsters.find((m) => m.id === monsterId);
    selectedMonster = monster || null;
    renderMonsterStats();
    try {
        await applyMonsterTexture(selectedMonster);
    } catch (error) {
        console.error('Failed to load monster texture', error);
    }
}

// --- Battle Simulation Logic ---

function calculateDamage(attacker: ICharacter, defender: ICharacter): number {
    // This is a simplified version from logic-core, as stat calculation is not needed here.
    const damage = attacker.attack - defender.defense;
    return damage <= 0 ? 1 : damage;
}

function simulateBattle(player: IPlayer, monster: IMonster): BattleResult {
    let playerHp = player.hp;
    let monsterHp = monster.maxhp;
    let turns = 0;

    const firstAttacker = player.speed >= monster.speed ? 'player' : 'monster';
    let currentAttacker = firstAttacker;

    while (playerHp > 0 && monsterHp > 0) {
        if (turns > 1000) break; // Safety break

        if (currentAttacker === 'player') {
            const damage = calculateDamage(player, monster);
            monsterHp -= damage;
            currentAttacker = 'monster';
        } else {
            const damage = calculateDamage(monster, player);
            playerHp -= damage;
            currentAttacker = 'player';
        }
        turns++;
    }

    const winner = playerHp > 0 ? 'player' : 'monster';
    return {
        winner,
        firstAttacker,
        turns,
        playerHpLeft: playerHp,
        monsterHpLeft: monsterHp,
        playerHpLostPercent: Math.round(((player.hp - playerHp) / player.hp) * 100),
        monsterHpLostPercent: Math.round(((monster.maxhp - monsterHp) / monster.maxhp) * 100),
    };
}

function animateAttack(
    attacker: CharacterEntity | null,
    defender: CharacterEntity | null,
    damage: number
): Promise<void> {
    if (!attacker || !defender) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        attacker.attack(defender, damage, () => {}, resolve);
    });
}

async function runBattleAnimation(player: IPlayer, monster: IMonster): Promise<BattleResult> {
    if (!playerEntity || !monsterEntity) {
        return simulateBattle(player, monster);
    }

    const playerState: IPlayer = { ...player, hp: player.maxhp };
    const monsterState: IMonster = { ...monster, hp: monster.maxhp };

    let playerHp = playerState.hp;
    let monsterHp = monsterState.maxhp;
    let turns = 0;
    const firstAttacker = player.speed >= monster.speed ? 'player' : 'monster';
    let currentAttacker: 'player' | 'monster' = firstAttacker;

    renderPlayerStats(playerHp);
    renderMonsterStats(monsterHp);

    playerEntity.setDirection('right');
    monsterEntity.setDirection('left');

    while (playerHp > 0 && monsterHp > 0) {
        if (turns > 1000) {
            break;
        }

        const attackerEntity = currentAttacker === 'player' ? playerEntity : monsterEntity;
        const defenderEntity = currentAttacker === 'player' ? monsterEntity : playerEntity;
        const attackerData = currentAttacker === 'player' ? playerState : monsterState;
        const defenderData = currentAttacker === 'player' ? monsterState : playerState;

        const damage = calculateDamage(attackerData, defenderData);
        await animateAttack(attackerEntity, defenderEntity, damage);

        if (currentAttacker === 'player') {
            monsterHp = Math.max(0, monsterHp - damage);
            monsterState.hp = monsterHp;
            renderMonsterStats(monsterHp);
        } else {
            playerHp = Math.max(0, playerHp - damage);
            playerState.hp = playerHp;
            renderPlayerStats(playerHp);
        }

        turns++;

        if (playerHp <= 0 || monsterHp <= 0) {
            break;
        }

        currentAttacker = currentAttacker === 'player' ? 'monster' : 'player';
    }

    const winner = playerHp > 0 ? 'player' : 'monster';

    return {
        winner,
        firstAttacker,
        turns,
        playerHpLeft: playerHp,
        monsterHpLeft: monsterHp,
        playerHpLostPercent: Math.round(((player.maxhp - playerHp) / player.maxhp) * 100),
        monsterHpLostPercent: Math.round(((monster.maxhp - monsterHp) / monster.maxhp) * 100),
    };
}

async function onSimulationClick() {
    if (battleInProgress) {
        return;
    }

    if (!selectedPlayer || !selectedMonster) {
        alert('Please configure a player and select a monster first.');
        return;
    }

    battleInProgress = true;

    try {
        const result = await runBattleAnimation(selectedPlayer, selectedMonster);

        const resultText = `
        --- Battle Result ---
        First Attacker: ${result.firstAttacker}
        Total Turns: ${result.turns}
        Winner: ${result.winner.toUpperCase()}

        --- Player ---
        HP Left: ${result.playerHpLeft} / ${selectedPlayer.maxhp}
        HP Lost: ${result.playerHpLostPercent}%

        --- Monster ---
        HP Left: ${result.monsterHpLeft} / ${selectedMonster.maxhp}
        HP Lost: ${result.monsterHpLostPercent}%
    `;

        alert(resultText);
    } catch (error) {
        console.error('Battle simulation failed', error);
    } finally {
        battleInProgress = false;
    }
}

// --- Rendering Logic ---

async function setupPixiApp() {
    const app = new Application();
    await app.init({
        width: simulationArea.clientWidth,
        height: simulationArea.clientHeight,
        backgroundColor: 0x111111,
        resizeTo: simulationArea,
    });
    if (pixiCanvas) {
        pixiCanvas.removeEventListener('click', onSimulationClick);
        if (pixiCanvas.parentElement === simulationArea) {
            simulationArea.removeChild(pixiCanvas);
        }
    }
    pixiCanvas = app.canvas as HTMLCanvasElement;
    simulationArea.appendChild(pixiCanvas);
    pixiCanvas.addEventListener('click', onSimulationClick);

    const assetUrls = {
        player: new URL('../../../../assets/player.png', import.meta.url).href,
        floor: new URL('../../../../assets/map/floor.png', import.meta.url).href,
    };

    await Assets.load([
        { alias: 'player', src: assetUrls.player },
        { alias: 'map_floor', src: assetUrls.floor },
    ]);

    const emptyLayout = Array(16)
        .fill(0)
        .map(() => Array(16).fill(0));
    const tileAssets: Record<string, ITileAsset> = {
        '0': { assetId: 'map_floor', isEntity: false },
    };
    // Construct a MapLayout for GameState.map
    const mapLayout = {
        floor: 1,
        layout: emptyLayout,
        tileAssets,
    };

    const gameState: GameState = {
        currentFloor: 1,
        map: mapLayout,
        tileAssets,
        player: {
            id: 'player',
            name: 'Player',
            hp: 1,
            maxhp: 1,
            attack: 1,
            defense: 1,
            speed: 1,
            level: 1,
            exp: 0,
            x: 7,
            y: 8,
            direction: 'right',
            equipment: {},
            backupEquipment: [],
            keys: { yellow: 0 },
            buffs: [],
            hasMonsterManual: false,
            specialItems: [],
        },
        entities: {},
        monsters: {},
        items: {},
        equipments: {},
        doors: {},
        stairs: {},
        interactionState: { type: 'none' },
    };

    mapRender = new MapRender(gameState);
    app.stage.addChild(mapRender as any);

    const toWorldX = (tileX: number) => tileX * TILE_SIZE + TILE_SIZE / 2;
    const toWorldY = (tileY: number) => (tileY + 1) * TILE_SIZE;

    playerEntity = new CharacterEntity(Assets.get('player') as any);
    playerEntity.x = toWorldX(7);
    playerEntity.y = toWorldY(8);
    playerEntity.zIndex = 8;
    playerEntity.visible = false;
    mapRender.addEntity(playerEntity);

    const initialMonsterTexture = await ensureMonsterTexture();
    monsterEntity = new CharacterEntity(initialMonsterTexture);
    monsterEntity.x = toWorldX(8);
    monsterEntity.y = toWorldY(8);
    monsterEntity.zIndex = 8;
    monsterEntity.visible = false;
    mapRender.addEntity(monsterEntity);

    app.ticker.add((time) => {
        mapRender?.update(time.deltaTime);
    });
    renderPlayerStats();
    renderMonsterStats();
    updateZoom();
    window.removeEventListener('resize', centerMap);
    window.addEventListener('resize', centerMap);
}

// --- Zoom Logic ---
function updateZoom() {
    if (mapRender) {
        const scale = zoomLevels[currentZoomIndex];
        mapRender.scale.set(scale);
        zoomDisplay.textContent = `${Math.round(scale * 100)}%`;
        centerMap();
    }
}

function centerMap() {
    if (!mapRender) {
        return;
    }
    const renderWidth = mapRender.width;
    const renderHeight = mapRender.height;
    const areaWidth = simulationArea.clientWidth;
    const areaHeight = simulationArea.clientHeight;

    mapRender.x = (areaWidth - renderWidth) / 2;
    mapRender.y = (areaHeight - renderHeight) / 2;
}

zoomInBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    if (currentZoomIndex < zoomLevels.length - 1) {
        currentZoomIndex++;
        updateZoom();
    }
});

zoomOutBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    if (currentZoomIndex > 0) {
        currentZoomIndex--;
        updateZoom();
    }
});

// --- Initialization ---

async function initialize() {
    console.log('Monster Editor client application loaded.');
    await Promise.all([fetchLevelData(), fetchAllMonsters()]);
    try {
        await setupPixiApp();
    } catch (error) {
        console.error('Failed to initialise Pixi renderer', error);
    }

    monsterLevelSelect.addEventListener('change', updateMonsterDropdown);
    playerLevelSelect.addEventListener('change', updatePlayerStatsDisplay);
    monsterSelect.addEventListener('change', () => {
        void updateMonsterStatsDisplay();
    });
    (document.getElementById('confirm-player-btn') as HTMLButtonElement).addEventListener(
        'click',
        () => {
            updatePlayerStatsDisplay();
            modal.style.display = 'none';
        }
    );
}

initialize();
