import { describe, it, expect } from 'vitest';
import { generateMapLayout, TILE_WALL } from './gen-map.js';
import type { GenMapParams } from './gen-map.js';

describe('Map Generator', () => {

  const baseParams: GenMapParams = {
    Width: 20,
    Height: 20,
    AreaNum: 4,
    LinkData: [[0, 1], [1, 2], [2, 3], [3, 0]],
    minAreaSize: {},
    mapAreaPos: {},
    outputFilename: 'test.json',
  };

  it('should generate a map with the correct dimensions', () => {
    const { layout } = generateMapLayout(baseParams);
    expect(layout.length).toBe(baseParams.Height);
    layout.forEach(row => {
      expect(row.length).toBe(baseParams.Width);
    });
  });

  it('should have a border of walls', () => {
    const { layout } = generateMapLayout(baseParams);
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

  it('should place required positions in the correct area', () => {
    const params: GenMapParams = {
      ...baseParams,
      mapAreaPos: {
        2: [[5, 5]], // Area 2 must contain the point (5, 5)
      },
    };
    const { areaGrid } = generateMapLayout(params);
    expect(areaGrid[5][5]).toBe(2);
  });

  it('should respect the minimum area size', () => {
    const minW = 5;
    const minH = 5;
    const params: GenMapParams = {
      ...baseParams,
      Width: 40,
      Height: 40,
      minAreaSize: {
        3: [minW, minH], // Area 3 must be at least 5x5
      },
    };
    const { areaGrid } = generateMapLayout(params);

    let area3_tiles = 0;
    for (let y = 0; y < params.Height; y++) {
      for (let x = 0; x < params.Width; x++) {
        if (areaGrid[y][x] === 3) {
          area3_tiles++;
        }
      }
    }
    // This is a weak check. A stronger check would be to find the bounding box.
    expect(area3_tiles).toBeGreaterThanOrEqual(minW * minH);
  });

});
