import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Renderer } from '../renderer';
import { GameState, IPlayer, IMonster } from '../../core/types';
import { Container, Sprite, Assets } from 'pixi.js';

// Mock Pixi.js components
vi.mock('pixi.js', async () => {
    const actualPixi = await vi.importActual('pixi.js');
    const mockContainer = {
        x: 0,
        y: 0,
        children: [] as any[],
        sortableChildren: false,
        addChild: vi.fn(function (this: any, child: any) {
            this.children.push(child);
        }),
        removeChild: vi.fn(function (this: any, child: any) {
            this.children = this.children.filter((c: any) => c !== child);
        }),
        removeChildren: vi.fn(function (this: any) {
            this.children = [];
        }),
    };

    return {
        ...actualPixi,
        Container: vi.fn(() => ({ ...mockContainer, children: [] })), // Ensure children is fresh for each instance
        Assets: {
            get: vi.fn((key) => ({ texture: key, width: 65, height: 130 })), // Mock texture dimensions
            init: vi.fn().mockResolvedValue(undefined),
            loadBundle: vi.fn().mockResolvedValue(undefined),
        },
        Sprite: vi.fn((texture) => ({
            __type: 'Sprite',
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            zIndex: 0,
            texture,
            anchor: {
                _x: 0,
                _y: 0,
                set: vi.fn(function (this: any, x: any, y: any) {
                    this._x = x;
                    this._y = y;
                }),
            },
            scale: {
                x: 1,
                y: 1,
                set: vi.fn(function (this: any, s: any) {
                    this.x = s;
                    this.y = s;
                }),
            },
            visible: true,
        })),
    };
});

vi.mock('@proj-tower/logic-core', async (importOriginal) => {
    const original = await importOriginal<typeof import('@proj-tower/logic-core')>();
    return {
        ...original,
        dataManager: {
            loadAllData: vi.fn().mockResolvedValue(undefined),
            getMapLayout: vi.fn(),
        },
    };
});

vi.mock('../ui/hud', () => ({
    HUD: vi.fn(() => ({
        update: vi.fn(),
    })),
}));

const TILE_SIZE = 65;

function createMockGameState(): GameState {
    const player: IPlayer = {
        id: 'player',
        name: 'Player',
        level: 1,
        exp: 0,
        hp: 100,
        maxhp: 100,
        attack: 10,
        defense: 5,
        speed: 10,
        x: 1,
        y: 1,
        direction: 'right',
        equipment: {},
        backupEquipment: [],
        buffs: [],
        keys: { yellow: 0, blue: 0, red: 0 },
    };
    const monster: IMonster = {
        id: 'monster_1',
        name: 'Test Monster',
        level: 1,
        hp: 10,
        maxhp: 10,
        attack: 3,
        defense: 1,
        speed: 5,
        x: 1,
        y: 2,
        direction: 'left',
        equipment: {},
        backupEquipment: [],
        buffs: [],
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
            player1: { ...player, type: 'player_start' },
            monster1: { ...monster, type: 'monster' },
        },
        monsters: { monster1: monster },
        items: {},
        equipments: {},
        doors: {},
        stairs: {},
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
        mockStage = new PIXI.Container();
        renderer = new Renderer(mockStage);
        gameState = createMockGameState();
    });

    it('should set mainContainer and topLayerContainer to be sortable', () => {
        expect(renderer['mainContainer'].sortableChildren).toBe(true);
        expect(renderer['topLayerContainer'].sortableChildren).toBe(true);
    });

    it('should create wall sprites with default scale', () => {
        renderer.initialize(gameState);
        const wallSprites = renderer['wallSprites'];
        expect(wallSprites.length).toBe(1);

        const wallSprite = wallSprites[0];
        expect(wallSprite.scale.x).toBe(1);
        expect(wallSprite.scale.y).toBe(1);
        expect(wallSprite.anchor._x).toBe(0.5);
        expect(wallSprite.anchor._y).toBe(1);
        expect(wallSprite.zIndex).toBe(0); // y-coordinate of the wall
    });

    it('should create entity sprites with default scale', () => {
        renderer.initialize(gameState);
        const playerSprite = renderer['entitySprites'].get('player1')!;
        const monsterSprite = renderer['entitySprites'].get('monster1')!;

        expect(playerSprite).toBeDefined();
        expect(playerSprite.scale.x).toBe(1);
        expect(playerSprite.scale.y).toBe(1);
        expect(playerSprite.anchor._x).toBe(0.5);
        expect(playerSprite.anchor._y).toBe(1);
        expect(playerSprite.zIndex).toBe(1); // player y = 1

        expect(monsterSprite).toBeDefined();
        expect(monsterSprite.zIndex).toBe(2); // monster y = 2
    });

    it('should flip sprite horizontally based on direction', () => {
        renderer.initialize(gameState);
        const playerSprite = renderer['entitySprites'].get('player1')!; // direction: 'right'
        const monsterSprite = renderer['entitySprites'].get('monster1')!; // direction: 'left'

        expect(playerSprite.scale.x).toBe(1);
        expect(monsterSprite.scale.x).toBe(-1);
    });

    it('should assign zIndex based on y-coordinate for sorting', () => {
        renderer.initialize(gameState);
        const playerSprite = renderer['entitySprites'].get('player1')!;
        const monsterSprite = renderer['entitySprites'].get('monster1')!;
        const wallSprite = renderer['wallSprites'][0];

        // Wall is at y=0, zIndex=0
        // Player is at y=1, zIndex=1
        // Monster is at y=2, zIndex=2
        expect(wallSprite.zIndex).toBe(0);
        expect(playerSprite.zIndex).toBe(1);
        expect(monsterSprite.zIndex).toBe(2);
    });
});
