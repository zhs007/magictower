import './style.css';
import { Application, Assets, Container } from 'pixi.js';
import { MapRender } from '@proj-tower/maprender';
import type { GameState, MapLayout, ITileAsset } from '@proj-tower/logic-core';
import { normalizeMapLayout } from '@proj-tower/logic-core';

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
const hintEl = document.getElementById('hint') as HTMLDivElement | null;
const zoomInBtn = document.getElementById('zoom-in') as HTMLButtonElement | null;
const zoomOutBtn = document.getElementById('zoom-out') as HTMLButtonElement | null;
const zoomDisplay = document.getElementById('zoom-display') as HTMLSpanElement | null;

// Painting state for drag-to-paint
let isPainting = false;
let pendingRender = false;
let lastPaintKey: string | null = null;


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
    zoom = 1;
    viewport: Container;

    constructor() {
        this.app = new Application();
        this.viewport = new Container();
    }

    async init() {
        await this.app.init({
            width: 800,
            height: 800,
            backgroundColor: 0x1099bb,
        });
        rendererPanel.appendChild(this.app.canvas);
        // mount viewport container
        this.app.stage.addChild(this.viewport);
        this.updateZoomUI();
    }

    async renderMap(mapLayout: MapLayout) {
        const canonical = normalizeMapLayout(mapLayout);

        if (this.mapRender) {
            this.mapRender.destroy({ children: true });
        }

        if (!canonical.tileAssets) return;
        const tileAssetValues = Object.values(canonical.tileAssets);

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
            currentFloor: canonical.floor,
            // GameState.map is now MapLayout: provide the full object
            map: canonical,
            tileAssets: canonical.tileAssets,
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
        this.viewport.addChild(this.mapRender);
    }

        setZoom(next: number) {
        const newZoom = Math.max(0.25, Math.min(4, next));
        const factor = newZoom / this.zoom;
        // zoom around the center of the renderer panel
        const rect = this.app.canvas.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        // Convert point (cx, cy) as screen point to adjust container position
        // Using standard zoom-to-point formula in container's parent coordinates
        const worldPosX = (cx - this.viewport.x) / this.viewport.scale.x;
        const worldPosY = (cy - this.viewport.y) / this.viewport.scale.y;

        this.viewport.scale.set(this.viewport.scale.x * factor, this.viewport.scale.y * factor);

        const newScreenPosX = worldPosX * this.viewport.scale.x + this.viewport.x;
        const newScreenPosY = worldPosY * this.viewport.scale.y + this.viewport.y;
        this.viewport.x += cx - newScreenPosX;
        this.viewport.y += cy - newScreenPosY;

        this.zoom = newZoom;
            this.updateZoomUI();
        }

        updateZoomUI() {
            if (zoomDisplay) {
                zoomDisplay.textContent = `${Math.round(this.zoom * 100)}%`;
            }
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
    updateHint();
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
    const raw = await response.json();
    state.currentMapId = mapId;
    state.currentMapData = normalizeMapLayout(raw);
    rerenderAll();
}

async function saveMap() {
    if (!state.currentMapId || !state.currentMapData) return;
    const normalized = normalizeMapLayout(state.currentMapData);
    state.currentMapData = normalized;
    await fetch(`/api/maps/${state.currentMapId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalized, null, 2),
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

    const newMapData: MapLayout = normalizeMapLayout({
        floor: parseInt(mapId.split('_').pop() || '1', 10),
        tileAssets: {
            '0': { assetId: 'map_floor', isEntity: false },
            '1': { assetId: 'map_wall', isEntity: true },
        },
        layout: newLayout,
        entities: {},
    });

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
        updateHint();
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

function paintCell(cell: HTMLElement) {
    if (!state.selectedTileId) {
        if (hintEl) hintEl.classList.remove('hidden');
        return;
    }
    if (!state.currentMapData || !state.currentMapData.layout) return;
    const x = parseInt(cell.dataset.x || '0', 10);
    const y = parseInt(cell.dataset.y || '0', 10);
    const key = `${x},${y}`;
    if (lastPaintKey === key) return; // avoid redundant updates
    (state.currentMapData.layout[y][x] as number) = parseInt(state.selectedTileId, 10);
    cell.textContent = String(state.selectedTileId);
    pendingRender = true;
    lastPaintKey = key;
}

// Single click paint (e.g., touchpad tap)
mapGrid.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const cell = target.closest('.grid-cell') as HTMLElement | null;
    if (!cell) return;
    paintCell(cell);
    if (pendingRender && state.currentMapData) {
        editorRenderer.renderMap(state.currentMapData);
        pendingRender = false;
        lastPaintKey = null;
    }
});

// Drag-to-paint: left mouse button
mapGrid.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // left only
    const target = e.target as HTMLElement;
    const cell = target.closest('.grid-cell') as HTMLElement | null;
    if (!cell) return;
    isPainting = true;
    paintCell(cell);
});

mapGrid.addEventListener('mousemove', (e) => {
    if (!isPainting) return;
    const target = e.target as HTMLElement;
    const cell = target.closest('.grid-cell') as HTMLElement | null;
    if (!cell) return;
    paintCell(cell);
});

window.addEventListener('mouseup', () => {
    if (!isPainting) return;
    isPainting = false;
    lastPaintKey = null;
    if (pendingRender && state.currentMapData) {
        editorRenderer.renderMap(state.currentMapData);
        pendingRender = false;
    }
});

function updateHint() {
    if (!hintEl) return;
    const shouldShow = !state.selectedTileId;
    hintEl.classList.toggle('hidden', !shouldShow);
}


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

// Wire zoom controls
if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
        editorRenderer.setZoom(editorRenderer.zoom * 1.25);
    });
}
if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
        editorRenderer.setZoom(editorRenderer.zoom / 1.25);
    });
}
