import { describe, it, expect } from 'vitest';
import { generateMapV2, TILE_WALL, TILE_FLOOR } from './gen-map-v2.js';
import type { GenMapV2Params } from './gen-map-v2.js';

describe('Map Generator V2', () => {

  const baseParams: GenMapV2Params = {
    Width: 20,
    Height: 20,
    templateData: [],
    forceFloorPos: [],
    outputFilename: 'test-v2.json',
    seed: 123,
  };

  it('should generate a map with the correct dimensions', () => {
    const { layout } = generateMapV2(baseParams);
    expect(layout.length).toBe(baseParams.Height);
    layout.forEach(row => {
      expect(row.length).toBe(baseParams.Width);
    });
  });

  it('should have a border of walls', () => {
    const { layout } = generateMapV2(baseParams);
    // Check top and bottom rows
    for (let x = 0; x < baseParams.Width; x++) {
      expect(layout[0][x]).toBe(TILE_WALL);
      expect(layout[baseParams.Height - 1][x]).toBe(TILE_WALL);
    }
    // Check left and right columns
    for (let y = 1; y < baseParams.Height - 1; y++) {
      expect(layout[y][0]).toBe(TILE_WALL);
      expect(layout[y][baseParams.Width - 1]).toBe(TILE_WALL);
    }
  });

  it('should be deterministic for a given seed', () => {
    const params1 = { ...baseParams, seed: 42 };
    const params2 = { ...baseParams, seed: 42 };
    const { layout: layout1 } = generateMapV2(params1);
    const { layout: layout2 } = generateMapV2(params2);
    expect(layout1).toEqual(layout2);
  });

  it('should not produce the same map for different seeds', () => {
    const params1 = { ...baseParams, seed: 1 };
    const params2 = { ...baseParams, seed: 2 };
    const { layout: layout1 } = generateMapV2(params1);
    const { layout: layout2 } = generateMapV2(params2);
    expect(layout1).not.toEqual(layout2);
  });


  it('should respect forceFloorPos constraint', () => {
    const params: GenMapV2Params = {
      ...baseParams,
      forceFloorPos: [[5, 5], [10, 12]],
    };
    const { layout } = generateMapV2(params);
    expect(layout[5][5]).toBe(TILE_FLOOR);
    expect(layout[12][10]).toBe(TILE_FLOOR);
  });

  it('should convert all door candidates to doors when doorDensity is 1', () => {
    const params: GenMapV2Params = {
        ...baseParams,
        seed: 1,
        maxPlacementAttempts: 50,
        doorDensity: 1, // 100% chance to become a door
    };
    const { layout } = generateMapV2(params);
    // This test assumes at least one door candidate was generated.
    // It checks that no TILE_DOOR_CANDIDATE (-2) remains, and they haven't all become walls.
    let hasNonWallInterior = false;
    for (let y = 1; y < params.Height -1; y++) {
        for (let x = 1; x < params.Width -1; x++) {
            expect(layout[y][x]).not.toBe(-2);
            if (layout[y][x] === TILE_FLOOR) {
                hasNonWallInterior = true;
            }
        }
    }
    expect(hasNonWallInterior).toBe(true); // Check that the map is not just all walls
  });

  it('should have more walls when doorDensity is 0 than when it is 1', () => {
    // Use a seed that is known to place some templates
    const params0 = { ...baseParams, seed: 1, doorDensity: 0, maxPlacementAttempts: 50 };
    const params1 = { ...baseParams, seed: 1, doorDensity: 1, maxPlacementAttempts: 50 };

    const { layout: layout0 } = generateMapV2(params0);
    const { layout: layout1 } = generateMapV2(params1);

    let wallCount0 = 0;
    layout0.forEach(row => row.forEach(tile => { if (tile === TILE_WALL) wallCount0++; }));

    let wallCount1 = 0;
    layout1.forEach(row => row.forEach(tile => { if (tile === TILE_WALL) wallCount1++; }));

    // This assumes at least one door candidate was generated and handled differently.
    // With seed 1, this should be the case.
    expect(wallCount0).toBeGreaterThan(wallCount1);
  });
});
