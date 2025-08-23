import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Renderer } from '../renderer';
import { GameState, IPlayer, IMonster, IItem } from '../../core/types';
import { Container } from 'pixi.js';

// Mock Pixi.js components
vi.mock('pixi.js', async () => {
    const actualPixi = await vi.importActual('pixi.js');
    return {
        ...actualPixi,
        Container: class {
            x = 0;
            y = 0;
            children: any[] = [];
            addChild = vi.fn((child) => this.children.push(child));
            removeChild = vi.fn();
            removeChildren = vi.fn(() => { this.children = []; });
        },
        Assets: {
            get: vi.fn(key => ({ texture: key })),
            init: vi.fn().mockResolvedValue(undefined),
            loadBundle: vi.fn().mockResolvedValue(undefined),
        },
        Sprite: vi.fn(texture => ({
            __type: 'Sprite',
            x: 0, y: 0, width: 0, height: 0, texture,
            anchor: { set: vi.fn() },
            scale: { x: 1, y: 1, set: vi.fn() },
            visible: true,
        })),
        Text: vi.fn(() => ({
            __type: 'Text',
            x: 0, y: 0,
            anchor: { set: vi.fn() },
            position: { set: vi.fn() },
            text: '',
            visible: true,
        })),
    };
});

vi.mock('../../data/data-manager', () => ({
    dataManager: {
        loadAllData: vi.fn().mockResolvedValue(undefined),
    },
}));

describe('Renderer', () => {
    let renderer: Renderer;
    let mockStage: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        const PIXI = await import('pixi.js');
        mockStage = new PIXI.Container();
        renderer = new Renderer(mockStage);
    });

    it('should call syncSprites and update HUD on render', () => {
        const gameState = createMockGameState();
        const syncSpritesSpy = vi.spyOn(renderer, 'syncSprites');
        const hudUpdateSpy = vi.spyOn(renderer.hud, 'update');

        renderer.render(gameState);

        expect(syncSpritesSpy).toHaveBeenCalledWith(gameState);
        expect(hudUpdateSpy).toHaveBeenCalledWith(gameState);
    });

    it('should render map tiles and entities correctly on initialize', async () => {
        const gameState = createMockGameState();
        renderer.initialize(gameState);

        // 4 floor tiles are always added
        expect(renderer['floorContainer'].addChild).toHaveBeenCalledTimes(4);
        // 1 wall + 3 entities are added to the main container
        expect(renderer['mainContainer'].addChild).toHaveBeenCalledTimes(4);

        const PIXI = await import('pixi.js');
        expect(PIXI.Assets.get).toHaveBeenCalledWith('wall');
        expect(PIXI.Assets.get).toHaveBeenCalledWith('floor');
        expect(PIXI.Assets.get).toHaveBeenCalledWith('player');
        expect(PIXI.Assets.get).toHaveBeenCalledWith('monster_green_slime');
        expect(PIXI.Assets.get).toHaveBeenCalledWith('item_yellow_key');
    });

    it('should position sprites correctly', () => {
        const gameState = createMockGameState();
        renderer.initialize(gameState); // Use initialize to create sprites

        const TILE_SIZE = 65;
        const addedSprites = renderer['mainContainer'].children;

        // Note: The mock player from createMockGameState is at x:1, y:1
        const playerSprite = addedSprites.find(s => s.texture.texture === 'player');
        expect(playerSprite).toBeDefined();
        expect(playerSprite.x).toBe(1 * TILE_SIZE + TILE_SIZE / 2);
        expect(playerSprite.y).toBe((1 + 1) * TILE_SIZE); // New Y calculation

        // Note: The mock monster is at x:0, y:1
        const monsterSprite = addedSprites.find(s => s.texture.texture === 'monster_green_slime');
        expect(monsterSprite).toBeDefined();
        expect(monsterSprite.x).toBe(0 * TILE_SIZE + TILE_SIZE / 2);
        expect(monsterSprite.y).toBe((1 + 1) * TILE_SIZE); // New Y calculation
    });
});

function createMockGameState(): GameState {
    const player: IPlayer = {
        id: 'player', name: 'Player', hp: 100, attack: 10, defense: 5, speed: 10, x: 1, y: 1,
        direction: 'right', equipment: {}, backupEquipment: [], buffs: [], keys: { yellow: 0, blue: 0, red: 0 }
    };
    const monster: IMonster = {
        id: 'monster_green_slime', name: 'Green Slime', hp: 10, attack: 3, defense: 1, speed: 5, x: 0, y: 1,
        direction: 'left', equipment: {}, backupEquipment: [], buffs: []
    };
    const item: IItem = {
        id: 'item_yellow_key', name: 'Yellow Key', type: 'key', color: 'yellow'
    };

    return {
        currentFloor: 1,
        map: [
            [0, 1],
            [0, 0],
        ],
        player,
        entities: {
            'player_start_0_0': { ...player, type: 'player_start' },
            'monster_1': { ...monster, type: 'monster', x: 0, y: 1 },
            'item_1': { ...item, type: 'item', x: 1, y: 0 },
        },
        monsters: { 'monster_1': monster },
        items: { 'item_1': item },
        equipments: {},
        doors: {},
        interactionState: { type: 'none' },
    };
}
