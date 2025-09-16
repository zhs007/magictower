import './style.css';
import { Application, Assets } from 'pixi.js';
import { MapRender } from '@proj-tower/maprender';
import type { GameState, TileAsset } from '@proj-tower/logic-core';

// --- DOM Elements ---
const mapSelector = document.getElementById('map-selector') as HTMLSelectElement;
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
    currentMapData: GameState | null;
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

    async renderMap(mapData: GameState) {
        if (this.mapRender) {
            this.mapRender.destroy({ children: true });
        }

        // Load assets required by the map
        const tileAssetValues = Object.values(mapData.tileAssets);

        for (const tileAsset of tileAssetValues) {
            try {
                // assetId is e.g. "map_floor", filename is "floor"
                const filename = tileAsset.assetId.replace('map_', '');
                const url = `/assets/map/${filename}.png`;
                // Load asset if not already loaded
                if (!Assets.get(tileAsset.assetId)) {
                    await Assets.load({ alias: tileAsset.assetId, src: url });
                }
            } catch (e) {
                console.warn(`Could not load asset: ${tileAsset.assetId}`);
            }
        }

        this.mapRender = new MapRender(mapData);
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
        option.value = assetName; // e.g. "floor"
        option.textContent = assetName;
        newTileAssetSelect.appendChild(option);
    });
}

function renderTilePalette() {
    tileList.innerHTML = '';
    if (!state.currentMapData) return;

    for (const tileId in state.currentMapData.tileAssets) {
        const tileAsset = state.currentMapData.tileAssets[tileId];
        const tileItem = document.createElement('div');
        tileItem.className = 'tile-item';
        if (state.selectedTileId === tileId) {
            tileItem.classList.add('selected');
        }
        tileItem.dataset.tileId = tileId;

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
    if (!state.currentMapData) return;

    state.currentMapData.map.layout.forEach((row, y) => {
        row.forEach((tileId, x) => {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.x = String(x);
            cell.dataset.y = String(y);
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

saveButton.addEventListener('click', saveMap);

tileList.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const tileItem = target.closest('.tile-item');
    if (tileItem && tileItem.dataset.tileId) {
        state.selectedTileId = tileItem.dataset.tileId;
        renderTilePalette(); // Rerender to show selection
    }
});

addTileButton.addEventListener('click', () => {
    if (!state.currentMapData) return;
    const newId = newTileIdInput.value;
    const selectedAssetName = newTileAssetSelect.value; // e.g. "floor"
    if (!newId || !selectedAssetName) {
        alert('Please provide a tile ID and select an asset.');
        return;
    }
    if (state.currentMapData.tileAssets[newId]) {
        alert('Tile ID already exists.');
        return;
    }

    state.currentMapData.tileAssets[newId] = {
        assetId: `map_${selectedAssetName}`, // Create the alias, e.g. "map_floor"
        isEntity: newTileIsEntityCheckbox.checked,
    };
    newTileIdInput.value = '';
    rerenderAll();
});

mapGrid.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('grid-cell') || !state.selectedTileId || !state.currentMapData) return;

    const x = parseInt(target.dataset.x!);
    const y = parseInt(target.dataset.y!);

    state.currentMapData.map.layout[y][x] = parseInt(state.selectedTileId, 10);
    // Rerender everything to reflect the change in the grid and the map preview
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
