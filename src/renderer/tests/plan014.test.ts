import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Renderer } from '../renderer';
import { GameState, IPlayer, IMonster } from '../../core/types';
import { Container, Sprite } from 'pixi.js';

// Mock Pixi.js components
vi.mock('pixi.js', async () => {
    const actualPixi = await vi.importActual('pixi.js');
    const mockContainer = {
        x: 0,
        y: 0,
        children: [] as any[],
        sortableChildren: false,
        addChild: vi.fn(function(child) { this.children.push(child); }),
        removeChild: vi.fn(function(child) { this.children = this.children.filter(c => c !== child); }),
        removeChildren: vi.fn(function() { this.children = []; }),
    };

    return {
        ...actualPixi,
        Container: vi.fn(() => ({ ...mockContainer, children: [] })), // Ensure children is fresh for each instance
        Assets: {
            get: vi.fn(key => ({ texture: key })),
            init: vi.fn().mockResolvedValue(undefined),
            loadBundle: vi.fn().mockResolvedValue(undefined),
        },
        Sprite: vi.fn(texture => ({
            __type: 'Sprite',
            x: 0, y: 0, width: 0, height: 0, zIndex: 0,
            texture,
            anchor: { _x: 0, _y: 0, set: vi.fn(function(x, y) { this._x = x; this._y = y; }) },
            scale: { x: 1, y: 1 },
            visible: true,
        })),
    };
});

vi.mock('../../data/data-manager', () => ({
    dataManager: {
        loadAllData: vi.fn().mockResolvedValue(undefined),
        getMapLayout: vi.fn(),
    },
}));

vi.mock('../ui/hud', () => ({
    HUD: vi.fn(() => ({
        update: vi.fn(),
    })),
}));

const TILE_SIZE = 65;

function createMockGameState(): GameState {
    const player: IPlayer = {
        id: 'player', name: 'Player', hp: 100, attack: 10, defense: 5, x: 1, y: 1,
        direction: 'right', equipment: {}, backupEquipment: [], buffs: [], keys: { yellow: 0, blue: 0, red: 0 }
    };
    const monster: IMonster = {
        id: 'monster_1', name: 'Test Monster', hp: 10, attack: 3, defense: 1, x: 1, y: 2,
        direction: 'left', equipment: {}, backupEquipment: [], buffs: []
    };

    return {
        currentFloor: 1,
        map: [
            [0, 1, 0], // y = 0
            [0, 0, 0], // y = 1
            [0, 0, 0], // y = 2
        ],
        player,
        entities: {
            'player1': { ...player, type: 'player_start' },
            'monster1': { ...monster, type: 'monster' },
        },
        monsters: { 'monster1': monster },
        items: {},
        equipments: {},
        doors: {},
        interactionState: { type: 'none' },
    };
}

describe('Renderer Z-Ordering and Sizing (Plan014)', () => {
    let renderer: Renderer;
    let mockStage: any;
    let gameState: GameState;

    beforeEach(async () => {
        vi.clearAllMocks();
        const PIXI = await import('pixi.js');
        mockStage = new (PIXI.Container)();
        renderer = new Renderer(mockStage);
        gameState = createMockGameState();
    });

    it('should set mainContainer and topLayerContainer to be sortable', () => {
        expect(renderer['mainContainer'].sortableChildren).toBe(true);
        expect(renderer['topLayerContainer'].sortableChildren).toBe(true);
    });

    it('should create wall sprites with correct properties', () => {
        renderer.initialize(gameState);
        const wallSprites = renderer['wallSprites'];
        expect(wallSprites.length).toBe(1);

        const wallSprite = wallSprites[0];
        expect(wallSprite.width).toBe(TILE_SIZE);
        expect(wallSprite.height).toBe(TILE_SIZE * 2);
        expect(wallSprite.anchor._x).toBe(0.5);
        expect(wallSprite.anchor._y).toBe(1);
        expect(wallSprite.zIndex).toBe(0); // y-coordinate of the wall
        expect(wallSprite.x).toBe(1 * TILE_SIZE + TILE_SIZE / 2);
        expect(wallSprite.y).toBe((0 + 1) * TILE_SIZE);
    });

    it('should create entity sprites with correct properties', () => {
        renderer.initialize(gameState);
        const playerSprite = renderer['entitySprites'].get('player1');
        const monsterSprite = renderer['entitySprites'].get('monster1');

        expect(playerSprite).toBeDefined();
        expect(playerSprite.width).toBe(TILE_SIZE);
        expect(playerSprite.height).toBe(TILE_SIZE * 2);
        expect(playerSprite.anchor._x).toBe(0.5);
        expect(playerSprite.anchor._y).toBe(1);
        expect(playerSprite.zIndex).toBe(1); // player y = 1
        expect(playerSprite.y).toBe((1 + 1) * TILE_SIZE);

        expect(monsterSprite).toBeDefined();
        expect(monsterSprite.zIndex).toBe(2); // monster y = 2
        expect(monsterSprite.y).toBe((2 + 1) * TILE_SIZE);
    });

    it('should flip sprite horizontally based on direction', () => {
        renderer.initialize(gameState);
        const playerSprite = renderer['entitySprites'].get('player1'); // direction: 'right'
        const monsterSprite = renderer['entitySprites'].get('monster1'); // direction: 'left'

        expect(playerSprite.scale.x).toBe(1);
        expect(monsterSprite.scale.x).toBe(-1);
    });

    it('should assign zIndex based on y-coordinate for sorting', () => {
        renderer.initialize(gameState);
        const playerSprite = renderer['entitySprites'].get('player1');
        const monsterSprite = renderer['entitySprites'].get('monster1');
        const wallSprite = renderer['wallSprites'][0];

        // Wall is at y=0, zIndex=0
        // Player is at y=1, zIndex=1
        // Monster is at y=2, zIndex=2
        expect(wallSprite.zIndex).toBe(0);
        expect(playerSprite.zIndex).toBe(1);
        expect(monsterSprite.zIndex).toBe(2);
    });
});
