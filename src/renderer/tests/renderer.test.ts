import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Renderer } from '../renderer';
import { GameState, IPlayer, IMonster, IItem } from '../../core/types';
import { Container } from 'pixi.js';

// Mock Pixi.js components
vi.mock('pixi.js', async () => {
    const actualPixi = await vi.importActual('pixi.js');
    // Factory function to create a new mock container each time
    const createMockContainer = () => ({
        addChild: vi.fn(),
        removeChildren: vi.fn(),
        x: 0,
        y: 0,
    });
    return {
        ...actualPixi,
        Container: vi.fn().mockImplementation(createMockContainer),
        Assets: {
            get: vi.fn(key => ({ texture: key })),
            init: vi.fn().mockResolvedValue(undefined),
            loadBundle: vi.fn().mockResolvedValue(undefined),
        },
        Sprite: vi.fn(texture => ({
            __type: 'Sprite',
            x: 0, y: 0, width: 0, height: 0, texture
        })),
        Text: vi.fn(() => ({ __type: 'Text', x: 0, y: 0 })),
        Graphics: vi.fn(() => ({
            __type: 'Graphics',
            fill: vi.fn().mockReturnThis(),
            drawRect: vi.fn().mockReturnThis(),
        })),
    };
});

vi.mock('../../data/data-manager', () => ({
    dataManager: {
        loadAllData: vi.fn().mockResolvedValue(undefined),
        monsters: new Map(),
        items: new Map(),
        equipments: new Map(),
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

    it('should clear containers on render', () => {
        const gameState = createMockGameState();
        renderer.render(gameState);
        expect(renderer.mapContainer.removeChildren).toHaveBeenCalledTimes(1);
        expect(renderer.hudContainer.removeChildren).toHaveBeenCalledTimes(1);
    });

    it('should render map tiles and entities correctly', async () => {
        const gameState = createMockGameState();
        renderer.render(gameState);

        expect(renderer.mapContainer.addChild).toHaveBeenCalledTimes(7);
        expect(renderer.hudContainer.addChild).toHaveBeenCalledTimes(2);

        const PIXI = await import('pixi.js');
        expect(PIXI.Assets.get).toHaveBeenCalledWith('wall');
        expect(PIXI.Assets.get).toHaveBeenCalledWith('floor');
        expect(PIXI.Assets.get).toHaveBeenCalledWith('player');
        expect(PIXI.Assets.get).toHaveBeenCalledWith('monster_green_slime');
        expect(PIXI.Assets.get).toHaveBeenCalledWith('item_yellow_key');
    });

    it('should position sprites correctly', () => {
        const gameState = createMockGameState();
        renderer.render(gameState);

        const TILE_SIZE = 65;
        const addedObjects = (renderer.mapContainer.addChild as any).mock.calls.map(call => call[0]);
        const addedSprites = addedObjects.filter(o => o.__type === 'Sprite');

        const playerSprite = addedSprites.find(s => s.texture.texture === 'player');
        expect(playerSprite).toBeDefined();
        expect(playerSprite.x).toBe(1 * TILE_SIZE);
        expect(playerSprite.y).toBe(1 * TILE_SIZE);

        const monsterSprite = addedSprites.find(s => s.texture.texture === 'monster_green_slime');
        expect(monsterSprite).toBeDefined();
        expect(monsterSprite.x).toBe(0 * TILE_SIZE);
        expect(monsterSprite.y).toBe(1 * TILE_SIZE);
    });
});

function createMockGameState(): GameState {
    const player: IPlayer = {
        id: 'player', name: 'Player', hp: 100, attack: 10, defense: 5, x: 1, y: 1,
        equipment: {}, backupEquipment: [], buffs: [], type: 'player_start'
    };
    const monster: IMonster = {
        id: 'monster_green_slime', name: 'Green Slime', hp: 10, attack: 3, defense: 1, x: 0, y: 1,
        equipment: {}, backupEquipment: [], buffs: [], type: 'monster'
    };
    const item: IItem = {
        id: 'item_yellow_key', name: 'Yellow Key', type: 'item', color: 'yellow', x: 1, y: 0,
    };

    return {
        currentFloor: 1,
        map: [
            [0, 1],
            [0, 0],
        ],
        player,
        entities: {
            'player_start': player,
            'monster_1': monster,
            'item_1': item,
        },
        monsters: { 'monster_1': monster },
        items: { 'item_1': item },
        equipments: {},
        doors: {},
    };
}
