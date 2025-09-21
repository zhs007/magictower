import { describe, it, expect } from 'vitest';
import { normalizeMapLayout } from '../map-utils';

describe('normalizeMapLayout', () => {
    it('converts raw 2D arrays into MapLayout with provided context', () => {
        const layout = [
            ['0', '1'],
            ['2', 'wall'],
        ];

        const normalized = normalizeMapLayout(layout, {
            floor: 2,
            tileAssets: { '0': { assetId: 'floor', isEntity: false } },
        });

        expect(normalized.floor).toBe(2);
        expect(normalized.layout).toEqual([
            [0, 1],
            [2, 'wall'],
        ]);
        expect(normalized.tileAssets).toEqual({ '0': { assetId: 'floor', isEntity: false } });
    });

    it('clones MapLayout fields to avoid mutating the source', () => {
        const source = {
            floor: 3,
            layout: [[0, 1]],
            tileAssets: { '1': { assetId: 'wall', isEntity: true } },
            entities: {
                player: { type: 'player_start' as const, id: 'player', x: 0, y: 0 },
            },
        };

        const normalized = normalizeMapLayout(source);

        expect(normalized).not.toBe(source);
        expect(normalized.layout).toEqual([[0, 1]]);
        expect(normalized.tileAssets).toEqual({ '1': { assetId: 'wall', isEntity: true } });

        // mutate results and ensure source does not change
        normalized.layout[0][0] = 2;
        normalized.tileAssets!['1'].isEntity = false;
        expect(source.layout[0][0]).toBe(0);
        expect(source.tileAssets!['1'].isEntity).toBe(true);
    });
});
