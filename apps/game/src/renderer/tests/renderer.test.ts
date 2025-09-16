import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import { Renderer } from '../renderer';
import { GameState, IPlayer, IMonster, IItem } from '../../core/types';
import { Container, Assets } from 'pixi.js';
import { MapRender } from '@proj-tower/maprender';
import { HUD } from '../ui/hud';

// Mock Pixi.js components
vi.mock('pixi.js', async () => {
    const actualPixi = await vi.importActual('pixi.js');
    const mockContainer = {
        x: 0,
        y: 0,
        children: [],
        sortableChildren: false,
        addChild: vi.fn(function (this: any, child: any) {
            this.children.push(child);
        }),
        addChildAt: vi.fn(function (this: any, child: any) {
            this.children.push(child);
        }),
        removeChild: vi.fn(),
        removeChildren: vi.fn(function (this: any) {
            this.children = [];
        }),
        destroy: vi.fn(),
    };
    return {
        ...actualPixi,
        Container: vi.fn(() => mockContainer),
        Assets: {
            get: vi.fn((key) => ({ texture: key })),
            init: vi.fn().mockResolvedValue(undefined),
            loadBundle: vi.fn().mockResolvedValue(undefined),
        },
        Sprite: vi.fn((texture) => ({
            __type: 'Sprite',
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            texture,
            anchor: { set: vi.fn() },
            scale: { x: 1, y: 1, set: vi.fn() },
            visible: true,
            parent: null,
        })),
    };
});

// Mock the maprender package
vi.mock('@proj-tower/maprender', () => {
    const MockMapRender = vi.fn().mockImplementation(() => {
        return {
            entityContainer: {
                addChild: vi.fn(),
                removeChild: vi.fn(),
                children: [],
            },
            destroy: vi.fn(),
        };
    });
    return { MapRender: MockMapRender };
});

// Mock the HUD
vi.mock('../ui/hud', () => {
    const MockHUD = vi.fn().mockImplementation(() => {
        return {
            update: vi.fn(),
            destroy: vi.fn(),
        };
    });
    return { HUD: MockHUD };
});

vi.mock('@proj-tower/logic-core', async (importOriginal) => {
    const original = await importOriginal<typeof import('@proj-tower/logic-core')>();
    return {
        ...original,
        dataManager: {
            loadAllData: vi.fn().mockResolvedValue(undefined),
        },
    };
});

vi.mock('gsap', () => ({
    gsap: {
        timeline: vi.fn((vars) => ({
            to: vi.fn().mockReturnThis(),
            vars, // Store vars to access onComplete
        })),
        to: vi.fn(),
    },
}));

describe('Renderer', () => {
    let renderer: Renderer;
    let mockStage: Container;

    beforeEach(() => {
        vi.clearAllMocks();
        mockStage = new (vi.mocked(Container))();
        renderer = new Renderer(mockStage);
    });

    it('should call syncSprites on render', () => {
        const gameState = createMockGameState();
        const syncSpritesSpy = vi.spyOn(renderer, 'syncSprites');
        renderer.render(gameState);
        expect(syncSpritesSpy).toHaveBeenCalledWith(gameState);
    });

    it('should create and add MapRender on initialize', () => {
        const gameState = createMockGameState();
        renderer.initialize(gameState);

        const MockedMapRender = vi.mocked(MapRender);
        expect(MockedMapRender).toHaveBeenCalledWith(gameState);

        const worldContainer = (renderer as any).worldContainer;
        expect(worldContainer.addChildAt).toHaveBeenCalled();
        // Check that the instance was assigned. `toBeInstanceOf` doesn't work well with Vitest mocks.
        expect((renderer as any).mapRender).toBeDefined();
    });

    it('should add entity sprites to the mapRender entityContainer', () => {
        const gameState = createMockGameState();
        renderer.initialize(gameState); // This creates the mapRender instance

        const mapRenderInstance = (renderer as any).mapRender;
        // 3 entities: player, monster, item
        expect(mapRenderInstance.entityContainer.addChild).toHaveBeenCalledTimes(3);
    });

    it('should position sprites correctly', () => {
        const gameState = createMockGameState();
        renderer.initialize(gameState);

        const TILE_SIZE = 65;
        const entitySprites = (renderer as any).entitySprites;

        const playerSprite = entitySprites.get('player_start_0_0');
        expect(playerSprite).toBeDefined();
        expect(playerSprite.x).toBe(1 * TILE_SIZE + TILE_SIZE / 2);
        expect(playerSprite.y).toBe((1 + 1) * TILE_SIZE);
        expect(playerSprite.zIndex).toBe(1);

        const monsterSprite = entitySprites.get('monster_1');
        expect(monsterSprite).toBeDefined();
        expect(monsterSprite.x).toBe(0 * TILE_SIZE + TILE_SIZE / 2);
        expect(monsterSprite.y).toBe((1 + 1) * TILE_SIZE);
        expect(monsterSprite.zIndex).toBe(1);
    });

    it('should call onComplete callback after item pickup animation', async () => {
        const gameState = createMockGameState();
        gameState.interactionState = { type: 'item_pickup', itemId: 'item_1' };
        renderer.initialize(gameState);

        const onComplete = vi.fn();
        await renderer.animateItemPickup(gameState, onComplete);

        const gsap = await import('gsap');
        const mockedTimeline = (gsap.gsap.timeline as any).mock.results[0].value;
        if (typeof mockedTimeline.vars.onComplete === 'function') {
            mockedTimeline.vars.onComplete();
        }

        expect(onComplete).toHaveBeenCalled();
    });

    it('should show floating text on an entity', () => {
        const gameState = createMockGameState();
        renderer.initialize(gameState);

        const textManagerAddSpy = vi.spyOn(renderer.floatingTextManager, 'add');
        const playerEntityKey = 'player_start_0_0';
        renderer.showFloatingTextOnEntity('Test Text', 'ITEM_GAIN', playerEntityKey);
        expect(textManagerAddSpy).toHaveBeenCalledWith('Test Text', 'ITEM_GAIN', playerEntityKey);
    });
});

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
        id: 'monster_green_slime',
        name: 'Green Slime',
        level: 1,
        hp: 10,
        maxhp: 10,
        attack: 3,
        defense: 1,
        speed: 5,
        x: 0,
        y: 1,
        direction: 'left',
        equipment: {},
        backupEquipment: [],
        buffs: [],
    };
    const item: IItem = { id: 'item_yellow_key', name: 'Yellow Key', type: 'key', color: 'yellow' };

    return {
        currentFloor: 1,
        map: [
            [0, 1],
            [0, 0],
        ],
        player,
        entities: {
            player_start_0_0: { ...player, type: 'player_start' },
            monster_1: { ...monster, type: 'monster', x: 0, y: 1 },
            item_1: { ...item, type: 'item', x: 1, y: 0 },
        },
        monsters: { monster_1: monster },
        items: { item_1: item },
        equipments: {},
        doors: {},
        stairs: {},
        interactionState: { type: 'none' },
    };
}
