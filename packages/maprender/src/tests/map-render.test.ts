import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MapRender } from '../map-render';
import { Entity } from '../entity';
import type { GameState } from '@proj-tower/logic-core';
import { Assets } from 'pixi.js';

// Mocking dependencies
vi.mock('pixi.js', async () => {
    const actual = await vi.importActual('pixi.js');
    return {
        ...actual,
        Assets: {
            get: vi.fn(),
        },
    };
});

vi.mock('../entity');

describe('MapRender', () => {
    let mockState: GameState;

    beforeEach(() => {
        mockState = {
            map: { floor: 1, layout: [[]] },
            entities: {},
            tileAssets: {},
        } as any;
    });

    it('should call update on all entities', () => {
        const mapRender = new MapRender(mockState);
        const entity1 = new Entity();
        const entity2 = new Entity();

        const updateSpy1 = vi.spyOn(entity1, 'update');
        const updateSpy2 = vi.spyOn(entity2, 'update');

        mapRender.addEntity(entity1);
        mapRender.addEntity(entity2);

        mapRender.update(16);

        expect(updateSpy1).toHaveBeenCalledWith(16);
        expect(updateSpy2).toHaveBeenCalledWith(16);
    });
});
