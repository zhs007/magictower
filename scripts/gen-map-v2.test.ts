import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { generateMapV2, TILE_WALL, TILE_FLOOR, TILE_EMPTY } from './gen-map-v2.js';
import type { GenMapV2Params, RoomTemplate, TemplateConstraint } from './gen-map-v2.js';

// Load templates for testing
const templatesPath = path.join(path.dirname(import.meta.url.replace('file://', '')), 'genmap2-templates.json');
const templatesFile = fs.readFileSync(templatesPath, 'utf-8');
const templates: RoomTemplate[] = JSON.parse(templatesFile);

describe('Map Generator V2', () => {

  const baseParams: GenMapV2Params = {
    Width: 20,
    Height: 20,
    templates: templates,
    templateData: [
        [1, 1, 99, 99, 1, 99] // Place one template of any size
    ],
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

  it('should have more walls when doorDensity is 0 than when it is 1', () => {
    const templateData: TemplateConstraint[] = [
        [1, 1, 99, 99, 1, 99], [1, 1, 99, 99, 1, 99], [1, 1, 99, 99, 1, 99]
    ];
    const params0 = { ...baseParams, seed: 1, doorDensity: 0, templateData };
    const params1 = { ...baseParams, seed: 1, doorDensity: 1, templateData };

    const { layout: layout0 } = generateMapV2(params0);
    const { layout: layout1 } = generateMapV2(params1);

    let wallCount0 = 0;
    layout0.forEach(row => row.forEach(tile => { if (tile === TILE_WALL) wallCount0++; }));

    let wallCount1 = 0;
    layout1.forEach(row => row.forEach(tile => { if (tile === TILE_WALL) wallCount1++; }));

    expect(wallCount0).toBeGreaterThan(wallCount1);
  });

  it('should not place any templates if constraints are impossible', () => {
    const params: GenMapV2Params = {
      ...baseParams,
      templateData: [
        [99, 99, 100, 100, 1, 1] // Impossible constraint
      ]
    };
    const { layout } = generateMapV2(params);
    let placedTiles = 0;
    for (let y = 1; y < params.Height - 1; y++) {
        for (let x = 1; x < params.Width - 1; x++) {
            // After finalization, empty tiles become floor tiles (0).
            // If any tile is not 0, something must have been placed.
            if (layout[y][x] !== TILE_FLOOR) {
                placedTiles++;
            }
        }
    }
    // This is a slightly weak test, as a template could consist of only floors.
    // A better check is to see if any tile is a wall other than the border.
    let interiorWalls = 0;
    for (let y = 1; y < params.Height - 1; y++) {
        for (let x = 1; x < params.Width - 1; x++) {
            if (layout[y][x] === TILE_WALL) {
                interiorWalls++;
            }
        }
    }
    expect(interiorWalls).toBe(0);
  });
});
