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
vi.mock('@proj-tower/maprender', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@proj-tower/maprender')>();

    const MockEntity = vi.fn(() => ({
        x: 0,
        y: 0,
        zIndex: 0,
        visible: true,
        children: [],
        addChild: vi.fn(),
        setDirection: vi.fn(),
        attack: vi.fn((defender, damage, showDamage, onComplete) => onComplete()),
        pickup: vi.fn((item, onComplete) => onComplete()),
    }));

    const MockCharacterEntity = vi.fn(() => ({
        ...new MockEntity(), // Inherits mock properties
    }));

    const MockMapRender = vi.fn().mockImplementation(() => {
        return {
            addEntity: vi.fn(),
            removeEntity: vi.fn(),
            entityContainer: {
                addChild: vi.fn(),
                removeChild: vi.fn(),
                children: [],
            },
            destroy: vi.fn(),
        };
    });

    return {
        ...actual,
        MapRender: MockMapRender,
        Entity: MockEntity,
        CharacterEntity: MockCharacterEntity,
    };
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

    it('should call syncEntities on render', () => {
        const gameState = createMockGameState();
        const syncEntitiesSpy = vi.spyOn(renderer, 'syncEntities');
        renderer.render(gameState);
        expect(syncEntitiesSpy).toHaveBeenCalledWith(gameState);
    });

    it('should create and add MapRender on initialize', () => {
        const gameState = createMockGameState();
        renderer.initialize(gameState);

        const MockedMapRender = vi.mocked(MapRender);
        expect(MockedMapRender).toHaveBeenCalledWith(gameState);

        const worldContainer = (renderer as any).worldContainer;
        expect(worldContainer.addChildAt).toHaveBeenCalled();
        expect((renderer as any).mapRender).toBeDefined();
    });

    it('should add entities to the mapRender', () => {
        const gameState = createMockGameState();
        renderer.initialize(gameState);

        const mapRenderInstance = (renderer as any).mapRender;
        expect(mapRenderInstance.addEntity).toHaveBeenCalledTimes(3);
    });

    it('should position entities correctly', () => {
        const gameState = createMockGameState();
        renderer.initialize(gameState);

        const TILE_SIZE = 65;
        const entities = (renderer as any).entities;

        const playerEntity = entities.get('player_start_0_0');
        expect(playerEntity).toBeDefined();
        expect(playerEntity.x).toBe(1 * TILE_SIZE + TILE_SIZE / 2);
        expect(playerEntity.y).toBe((1 + 1) * TILE_SIZE);
        expect(playerEntity.zIndex).toBe(1);

        const monsterEntity = entities.get('monster_1');
        expect(monsterEntity).toBeDefined();
        expect(monsterEntity.x).toBe(0 * TILE_SIZE + TILE_SIZE / 2);
        expect(monsterEntity.y).toBe((1 + 1) * TILE_SIZE);
        expect(monsterEntity.zIndex).toBe(1);
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
