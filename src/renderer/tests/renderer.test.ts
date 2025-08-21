import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Renderer } from '../renderer';
import { GameState, EntityType, IPlayer, IMonster, IItem } from '../../core/types';
import { Container } from 'pixi.js';

vi.mock('pixi.js', () => ({
    Container: vi.fn(() => ({
        addChild: vi.fn(),
        removeChildren: vi.fn(),
    })),
    Assets: {
        get: vi.fn(key => key), // Return the key as the texture for easy identification
        init: vi.fn().mockResolvedValue(undefined),
        loadBundle: vi.fn().mockResolvedValue(undefined),
    },
    Sprite: vi.fn(texture => ({
        x: 0,
        y: 0,
        texture: texture,
    })),
    Texture: {
        EMPTY: 'empty_texture',
    },
}));

// Mock dataManager as it's a dependency for loadAssets
vi.mock('../../data/data-manager', () => ({
    dataManager: {
        loadAllData: vi.fn().mockResolvedValue(undefined),
        monsters: new Map([['monster_green_slime', { id: 'monster_green_slime' }]]),
        items: new Map([['item_yellow_key', { id: 'item_yellow_key' }]]),
        equipments: new Map(),
    },
}));

describe('Renderer', () => {
    let renderer: Renderer;
    let mockStage: Container;
    let PIXI;

    beforeEach(async () => {
        vi.clearAllMocks();
        PIXI = await import('pixi.js');
        mockStage = new PIXI.Container();
        renderer = new Renderer(mockStage);
    });

    it('should clear the stage on render', () => {
        const gameState = createMockGameState();
        renderer.render(gameState);
        expect(mockStage.removeChildren).toHaveBeenCalledOnce();
    });

    it('should render map tiles and entities correctly', () => {
        const gameState = createMockGameState();
        renderer.render(gameState);

        // 25 ground sprites + 3 entity sprites = 28 sprites
        expect(mockStage.addChild).toHaveBeenCalledTimes(28);

        expect(PIXI.Assets.get).toHaveBeenCalledWith('wall');
        expect(PIXI.Assets.get).toHaveBeenCalledWith('ground');
        expect(PIXI.Assets.get).toHaveBeenCalledWith('player');
        expect(PIXI.Assets.get).toHaveBeenCalledWith('monster_green_slime');
        expect(PIXI.Assets.get).toHaveBeenCalledWith('item_yellow_key');
    });

    it('should position sprites correctly', () => {
        const gameState = createMockGameState();
        renderer.render(gameState);

        const TILE_SIZE = 32;
        const addedSprites = (mockStage.addChild as any).mock.calls.map(call => call[0]);

        // In the renderer, player sprite is looked up by state.player.id, which is 'player'
        // and the asset is loaded with alias 'player'
        const playerSprite = addedSprites.find(s => s.texture === 'player');
        expect(playerSprite).toBeDefined();
        expect(playerSprite.x).toBe(1 * TILE_SIZE);
        expect(playerSprite.y).toBe(1 * TILE_SIZE);

        const monsterSprite = addedSprites.find(s => s.texture === 'monster_green_slime');
        expect(monsterSprite).toBeDefined();
        expect(monsterSprite.x).toBe(3 * TILE_SIZE);
        expect(monsterSprite.y).toBe(1 * TILE_SIZE);

        const itemSprite = addedSprites.find(s => s.texture === 'item_yellow_key');
        expect(itemSprite).toBeDefined();
        expect(itemSprite.x).toBe(1 * TILE_SIZE);
        expect(itemSprite.y).toBe(3 * TILE_SIZE);
    });
});

function createMockGameState(): GameState {
    const player: IPlayer = {
        id: 'player', name: 'Player', hp: 100, attack: 10, defense: 5, x: 1, y: 1,
        equipment: {}, backupEquipment: [], buffs: [],
    };
    const monster: IMonster = {
        id: 'monster_green_slime', name: 'Green Slime', hp: 10, attack: 3, defense: 1, x: 3, y: 1,
        equipment: {}, backupEquipment: [], buffs: [],
    };
    const item: IItem = {
        id: 'item_yellow_key', name: 'Yellow Key', type: 'key', color: 'yellow',
    };

    return {
        currentFloor: 1,
        map: [
            [{ groundLayer: 1 }, { groundLayer: 1 }, { groundLayer: 1 }, { groundLayer: 1 }, { groundLayer: 1 }],
            [{ groundLayer: 1 }, { groundLayer: 0, entityLayer: { type: EntityType.PLAYER, id: 'player' } }, { groundLayer: 0 }, { groundLayer: 0, entityLayer: { type: EntityType.MONSTER, id: 'monster_green_slime' } }, { groundLayer: 1 }],
            [{ groundLayer: 1 }, { groundLayer: 0 }, { groundLayer: 1 }, { groundLayer: 0 }, { groundLayer: 1 }],
            [{ groundLayer: 1 }, { groundLayer: 0, entityLayer: { type: EntityType.ITEM, id: 'item_yellow_key' } }, { groundLayer: 0 }, { groundLayer: 0 }, { groundLayer: 1 }],
            [{ groundLayer: 1 }, { groundLayer: 1 }, { groundLayer: 1 }, { groundLayer: 1 }, { groundLayer: 1 }],
        ],
        player,
        monsters: { [monster.id]: monster },
        items: { [item.id]: item },
        equipments: {},
        doors: {},
    };
}
