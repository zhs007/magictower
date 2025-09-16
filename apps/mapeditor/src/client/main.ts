import './style.css';
import { Application, Assets } from 'pixi.js';
import { MapRender } from '@proj-tower/maprender';
import type { GameState, MapLayout, ITileAsset } from '@proj-tower/logic-core';

// --- DOM Elements ---
const mapSelector = document.getElementById('map-selector') as HTMLSelectElement;
const newMapButton = document.getElementById('new-map-button') as HTMLButtonElement;
const saveButton = document.getElementById('save-button') as HTMLButtonElement;
const tileList = document.getElementById('tile-list') as HTMLDivElement;
const addTileButton = document.getElementById('add-tile-button') as HTMLButtonElement;
const newTileIdInput = document.getElementById('new-tile-id') as HTMLInputElement;
const newTileAssetSelect = document.getElementById('new-tile-asset') as HTMLSelectElement;
const newTileIsEntityCheckbox = document.getElementById('new-tile-is-entity') as HTMLInputElement;
const mapGrid = document.getElementById('map-grid') as HTMLDivElement;
const rendererPanel = document.getElementById('renderer-panel') as HTMLDivElement;


// --- State ---
let state: {
    maps: string[];
    currentMapId: string | null;
    currentMapData: MapLayout | null; // Correct data type for map files
    tileAssets: string[];
    selectedTileId: string | null;
} = {
    maps: [],
    currentMapId: null,
    currentMapData: null,
    tileAssets: [],
    selectedTileId: null,
};

// --- Renderer ---
class EditorRenderer {
    app: Application;
    mapRender: MapRender | null = null;

    constructor() {
        this.app = new Application();
    }

    async init() {
        await this.app.init({
            width: 800,
            height: 800,
            backgroundColor: 0x1099bb,
        });
        rendererPanel.appendChild(this.app.canvas);
    }

    async renderMap(mapLayout: MapLayout) {
        if (this.mapRender) {
            this.mapRender.destroy({ children: true });
        }

        if (!mapLayout.tileAssets) return;
        const tileAssetValues = Object.values(mapLayout.tileAssets);

        for (const tileAsset of tileAssetValues) {
            try {
                const filename = tileAsset.assetId.replace('map_', '');
                const url = `/assets/map/${filename}.png`;
                if (!Assets.get(tileAsset.assetId)) {
                    await Assets.load({ alias: tileAsset.assetId, src: url });
                }
            } catch (e) {
                console.warn(`Could not load asset: ${tileAsset.assetId}`);
            }
        }

        // MapRender expects a GameState, so we create a dummy one.
        const dummyGameState: GameState = {
            currentFloor: mapLayout.floor,
            map: mapLayout.layout as number[][], // Assuming layout is number[][]
            tileAssets: mapLayout.tileAssets,
            player: null!, // Not used by MapRender
            entities: {}, // Not used by MapRender
            monsters: {}, // Not used by MapRender
            items: {}, // Not used by MapRender
            equipments: {}, // Not used by MapRender
            doors: {}, // Not used by MapRender
            stairs: {}, // Not used by MapRender
            interactionState: { type: 'none' }, // Not used by MapRender
        };

        this.mapRender = new MapRender(dummyGameState);
        this.app.stage.addChild(this.mapRender);
    }
}
const editorRenderer = new EditorRenderer();


// --- UI Rendering Functions ---
function renderMapSelector() {
    mapSelector.innerHTML = '<option value="">Select a map</option>';
    state.maps.forEach(mapId => {
        const option = document.createElement('option');
        option.value = mapId;
        option.textContent = mapId;
        option.selected = state.currentMapId === mapId;
        mapSelector.appendChild(option);
    });
}

function renderTileAssetSelector() {
    newTileAssetSelect.innerHTML = '';
    state.tileAssets.forEach(assetName => {
        const option = document.createElement('option');
        option.value = assetName;
        option.textContent = assetName;
        newTileAssetSelect.appendChild(option);
    });
}

function renderTilePalette() {
    tileList.innerHTML = '';
    if (!state.currentMapData || !state.currentMapData.tileAssets) return;

    for (const tileId in state.currentMapData.tileAssets) {
        const tileAsset = state.currentMapData.tileAssets[tileId];
        const tileItem = document.createElement('div');
        tileItem.className = 'tile-item';
        if (state.selectedTileId === tileId) {
            tileItem.classList.add('selected');
        }
        (tileItem as HTMLElement).dataset.tileId = tileId;

        const img = document.createElement('img');
        const filename = tileAsset.assetId.replace('map_', '');
        img.src = `/assets/map/${filename}.png`;

        const idLabel = document.createElement('div');
        idLabel.textContent = `ID: ${tileId}`;

        const entityLabel = document.createElement('div');
        entityLabel.textContent = tileAsset.isEntity ? 'Entity' : 'Floor';

        tileItem.appendChild(img);
        tileItem.appendChild(idLabel);
        tileItem.appendChild(entityLabel);
        tileList.appendChild(tileItem);
    }
}

function renderMapGrid() {
    mapGrid.innerHTML = '';
    if (!state.currentMapData || !state.currentMapData.layout) {
        mapGrid.style.gridTemplateColumns = '';
        mapGrid.style.gridTemplateRows = '';
        return;
    }

    const height = state.currentMapData.layout.length;
    const width = state.currentMapData.layout[0]?.length || 0;

    mapGrid.style.gridTemplateColumns = `repeat(${width}, 20px)`;
    mapGrid.style.gridTemplateRows = `repeat(${height}, 20px)`;

    state.currentMapData.layout.forEach((row, y) => {
        row.forEach((tileId, x) => {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            (cell as HTMLElement).dataset.x = String(x);
            (cell as HTMLElement).dataset.y = String(y);
            cell.textContent = String(tileId);
            mapGrid.appendChild(cell);
        });
    });
}

function rerenderAll() {
    renderMapSelector();
    renderTileAssetSelector();
    renderTilePalette();
    renderMapGrid();
    if (state.currentMapData) {
        editorRenderer.renderMap(state.currentMapData);
    }
}

// --- API Calls ---
async function fetchMaps() {
    const response = await fetch('/api/maps');
    state.maps = await response.json();
}

async function fetchTileAssets() {
    const response = await fetch('/api/assets/tiles');
    state.tileAssets = await response.json();
}

async function loadMap(mapId: string) {
    if (!mapId) {
        state.currentMapId = null;
        state.currentMapData = null;
        rerenderAll();
        return;
    }
    const response = await fetch(`/api/maps/${mapId}`);
    state.currentMapId = mapId;
    state.currentMapData = await response.json();
    rerenderAll();
}

async function saveMap() {
    if (!state.currentMapId || !state.currentMapData) return;
    await fetch(`/api/maps/${state.currentMapId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.currentMapData, null, 2),
    });
    alert('Map saved!');
}

// --- Event Listeners ---
mapSelector.addEventListener('change', () => {
    loadMap(mapSelector.value);
});

newMapButton.addEventListener('click', () => {
    const mapId = prompt('Enter new map name (e.g., floor_04):');
    if (!mapId) return;

    if (state.maps.includes(mapId)) {
        alert(`Map '${mapId}' already exists.`);
        return;
    }

    const width = parseInt(import.meta.env.VITE_DEFAULT_MAP_WIDTH || '16', 10);
    const height = parseInt(import.meta.env.VITE_DEFAULT_MAP_HEIGHT || '16', 10);

    const newLayout = Array.from({ length: height }, () => Array(width).fill(0));

    const newMapData: MapLayout = {
        floor: parseInt(mapId.split('_').pop() || '1', 10),
        tileAssets: {
            "0": { assetId: "map_floor", isEntity: false },
            "1": { assetId: "map_wall", isEntity: true },
        },
        layout: newLayout,
        entities: {},
    };

    state.currentMapId = mapId;
    state.currentMapData = newMapData;
    state.maps.push(mapId);
    state.maps.sort();
    rerenderAll();
});

saveButton.addEventListener('click', saveMap);

tileList.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const tileItem = target.closest('.tile-item') as HTMLElement;
    if (tileItem && tileItem.dataset.tileId) {
        state.selectedTileId = tileItem.dataset.tileId;
        renderTilePalette();
    }
});

addTileButton.addEventListener('click', () => {
    if (!state.currentMapData || !state.currentMapData.tileAssets) return;
    const newId = newTileIdInput.value;
    const selectedAssetName = newTileAssetSelect.value;
    if (!newId || !selectedAssetName) {
        alert('Please provide a tile ID and select an asset.');
        return;
    }
    if (state.currentMapData.tileAssets[newId]) {
        alert('Tile ID already exists.');
        return;
    }

    state.currentMapData.tileAssets[newId] = {
        assetId: `map_${selectedAssetName}`,
        isEntity: newTileIsEntityCheckbox.checked,
    };
    newTileIdInput.value = '';
    rerenderAll();
});

mapGrid.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('grid-cell') || !state.selectedTileId || !state.currentMapData || !state.currentMapData.layout) return;

    const x = parseInt((target as HTMLElement).dataset.x!);
    const y = parseInt((target as HTMLElement).dataset.y!);

    (state.currentMapData.layout[y][x] as number) = parseInt(state.selectedTileId, 10);
    rerenderAll();
});


// --- Initialization ---
async function init() {
    await Promise.all([
        fetchMaps(),
        fetchTileAssets(),
        editorRenderer.init()
    ]);
    rerenderAll();
}

init();
