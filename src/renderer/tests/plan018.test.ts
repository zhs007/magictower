import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Assets, Container, Texture } from 'pixi.js';
import { Renderer } from '../renderer';
import { GameState } from '../../core/types';

// Mock Pixi.js Assets
vi.mock('pixi.js', async () => {
    const actual = await vi.importActual('pixi.js');
    return {
        ...actual,
        Assets: {
            get: vi.fn((alias) => Texture.EMPTY),
            init: vi.fn(),
            loadBundle: vi.fn(),
        },
    };
});

describe('Renderer plan018 tests', () => {
    let renderer: Renderer;
    let stage: Container;

    beforeEach(() => {
        stage = new Container();
        renderer = new Renderer(stage);
        vi.clearAllMocks();
    });

    it('should use tileAssets for drawing map when provided', () => {
        const gameState: GameState = {
            currentFloor: 1,
            map: [
                [1, 0],
                [0, 1],
            ],
            tileAssets: {
                '0': 'custom_floor',
                '1': 'custom_wall',
            },
            player: {} as any,
            entities: {},
            monsters: {},
            items: {},
            equipments: {},
            doors: {},
            interactionState: { type: 'none' },
        };

        (renderer as any).drawMap(gameState);

        expect(Assets.get).toHaveBeenCalledWith('custom_floor');
        expect(Assets.get).toHaveBeenCalledWith('custom_wall');
        expect(Assets.get).toHaveBeenCalledTimes(6); // 2 floors, 2 walls + 2 floors under walls
    });

    it('should fall back to old logic when tileAssets is not provided', () => {
        const gameState: GameState = {
            currentFloor: 1,
            map: [[1, 0]],
            player: {} as any,
            entities: {},
            monsters: {},
            items: {},
            equipments: {},
            doors: {},
            interactionState: { type: 'none' },
        };

        (renderer as any).drawMap(gameState);

        // The old logic uses resolveTextureAlias which calls Assets.get
        expect(Assets.get).toHaveBeenCalledWith('map_wall');
        expect(Assets.get).toHaveBeenCalledWith('map_floor');
        expect(Assets.get).toHaveBeenCalledTimes(3); // 1 floor, 1 wall + 1 floor under the wall
    });

    it('should use floor tile as fallback for unknown tile values in tileAssets', () => {
        const gameState: GameState = {
            currentFloor: 1,
            map: [
                [2, 0], // 2 is an unknown tile value
            ],
            tileAssets: {
                '0': 'custom_floor',
                '1': 'custom_wall',
            },
            player: {} as any,
            entities: {},
            monsters: {},
            items: {},
            equipments: {},
            doors: {},
            interactionState: { type: 'none' },
        };

        (renderer as any).drawMap(gameState);

        // It should be called for the floor tile (0) and the fallback (2)
        expect(Assets.get).toHaveBeenCalledWith('custom_floor');
        expect(Assets.get).toHaveBeenCalledTimes(2);
        // It should not be called for the wall tile
        expect(Assets.get).not.toHaveBeenCalledWith('custom_wall');
    });
});
