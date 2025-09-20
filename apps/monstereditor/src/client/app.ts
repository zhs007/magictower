import { Application, Assets } from 'pixi.js';
import { MapRender } from '@proj-tower/maprender';
import { CharacterEntity } from '@proj-tower/maprender';
import { GameState, Player, Monster, TileAsset, ICharacter } from '@proj-tower/logic-core';

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


// --- State ---
let allMonsters: Monster[] = [];
let levelData: LevelData[] = [];
let selectedPlayer: Player | null = null;
let selectedMonster: Monster | null = null;
let mapRender: MapRender | null = null;
let playerEntity: CharacterEntity | null = null;
let monsterEntity: CharacterEntity | null = null;
const zoomLevels = [0.5, 0.75, 1, 1.25, 1.5, 2];
let currentZoomIndex = 2; // 100%

// --- Modal Logic ---
playerConfigBtn.onclick = () => { modal.style.display = 'block'; };
closeModalBtn.onclick = () => { modal.style.display = 'none'; };
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
    const monsterPromises = monsterIds.map(id =>
      fetch(`/api/monsters/${id}`).then(res => res.json())
    );
    allMonsters = await Promise.all(monsterPromises);
  } catch (error) {
    console.error(error);
    monsterSelect.innerHTML = '<option>Error</option>';
  }
}

function populateLevelSelect(selectElement: HTMLSelectElement, data: LevelData[]) {
  selectElement.innerHTML = '<option value="">Select level</option>';
  data.forEach(levelInfo => {
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
  updateMonsterStatsDisplay();
  if (!isNaN(selectedLevel)) {
    const filteredMonsters = allMonsters.filter(m => m.level === selectedLevel);
    if (filteredMonsters.length === 0) {
      monsterSelect.innerHTML = '<option>None</option>';
      return;
    }
    filteredMonsters.forEach(monster => {
      const option = document.createElement('option');
      option.value = monster.id;
      option.textContent = monster.name;
      monsterSelect.appendChild(option);
    });
  }
}

function updatePlayerStatsDisplay() {
    const level = parseInt(playerLevelSelect.value, 10);
    const stats = levelData.find(l => l.level === level);
    if (stats) {
        selectedPlayer = {
            ...stats,
            id: 'player',
            hp: stats.maxhp,
            name: 'Player',
            x: 7, y: 8, direction: 'right',
            equipment: {}, backupEquipment: [], keys: { yellow: 0 },
            exp: 0, hasMonsterManual: false, specialItems: [],
        };
        playerStatsDisplay.innerHTML = `
            <b>Player (Lvl ${stats.level})</b><br/>
            HP: ${stats.maxhp}<br/>
            ATK: ${stats.attack}<br/>
            DEF: ${stats.defense}<br/>
            SPD: ${stats.speed}
        `;
    } else {
        selectedPlayer = null;
        playerStatsDisplay.innerHTML = 'Select a level.';
    }
}


function updateMonsterStatsDisplay() {
    const monsterId = monsterSelect.value;
    const monster = allMonsters.find(m => m.id === monsterId);
    selectedMonster = monster || null;
    if (monster) {
        monsterStatsDisplay.innerHTML = `
            <b>${monster.name} (Lvl ${monster.level})</b><br/>
            HP: ${monster.maxhp}<br/>
            ATK: ${monster.attack}<br/>
            DEF: ${monster.defense}<br/>
            SPD: ${monster.speed}
        `;
        if (monsterEntity) monsterEntity.visible = true;
    } else {
        monsterStatsDisplay.innerHTML = 'Select a monster.';
        if (monsterEntity) monsterEntity.visible = false;
    }
}

// --- Battle Simulation Logic ---

function calculateDamage(attacker: ICharacter, defender: ICharacter): number {
    // This is a simplified version from logic-core, as stat calculation is not needed here.
    const damage = attacker.attack - defender.defense;
    return damage <= 0 ? 1 : damage;
}

function simulateBattle(player: Player, monster: Monster): BattleResult {
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

function onSimulationClick() {
    if (!selectedPlayer || !selectedMonster) {
        alert('Please configure a player and select a monster first.');
        return;
    }

    const result = simulateBattle(selectedPlayer, selectedMonster);

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
  simulationArea.appendChild(app.view as HTMLCanvasElement);
  simulationArea.addEventListener('click', onSimulationClick);

  await Assets.load([
      { alias: 'player', src: 'assets/player.png' },
      { alias: 'monster_monster', src: 'assets/monster/monster.png' },
      { alias: 'map_floor', src: 'assets/map/floor.png' }
  ]);

  const emptyLayout = Array(16).fill(0).map(() => Array(16).fill(0));
  const tileAssets: Record<string, TileAsset> = {
      '0': { assetId: 'map_floor', isEntity: false }
  };
  const gameState: GameState = {
      map: { layout: emptyLayout, entities: {} }, tileAssets,
      player: { id: 'player', name: 'Player', hp: 1, maxhp: 1, attack: 1, defense: 1, speed: 1, level: 1, exp: 0, x: 7, y: 8, direction: 'right', equipment: {}, backupEquipment: [], keys: {yellow: 0}, hasMonsterManual: false, specialItems: [] },
      monsters: {}, items: {}, equipments: {}, doors: {}, npcs: {}, stairs: {}
  };

  mapRender = new MapRender(gameState);
  app.stage.addChild(mapRender);

  playerEntity = new CharacterEntity('player');
  playerEntity.x = 7;
  playerEntity.y = 8;
  mapRender.addEntity(playerEntity);

  monsterEntity = new CharacterEntity('monster_monster');
  monsterEntity.x = 8;
  monsterEntity.y = 8;
  monsterEntity.visible = false;
  mapRender.addEntity(monsterEntity);

  app.ticker.add((time) => { mapRender?.update(time.deltaTime); });
  updateZoom();
}

// --- Zoom Logic ---
function updateZoom() {
    if (mapRender) {
        const scale = zoomLevels[currentZoomIndex];
        mapRender.scale.set(scale);
        zoomDisplay.textContent = `${Math.round(scale * 100)}%`;
    }
}

zoomInBtn.onclick = () => {
    if (currentZoomIndex < zoomLevels.length - 1) {
        currentZoomIndex++;
        updateZoom();
    }
};

zoomOutBtn.onclick = () => {
    if (currentZoomIndex > 0) {
        currentZoomIndex--;
        updateZoom();
    }
};


// --- Initialization ---

async function initialize() {
  console.log("Monster Editor client application loaded.");
  await Promise.all([ fetchLevelData(), fetchAllMonsters() ]);
  await setupPixiApp();

  monsterLevelSelect.addEventListener('change', updateMonsterDropdown);
  playerLevelSelect.addEventListener('change', updatePlayerStatsDisplay);
  monsterSelect.addEventListener('change', updateMonsterStatsDisplay);
  (document.getElementById('confirm-player-btn') as HTMLButtonElement).addEventListener('click', () => {
      updatePlayerStatsDisplay();
      modal.style.display = 'none';
  });
}

initialize();
