/**
 * @fileoverview Runner for the map generator script.
 * This file contains the main execution logic, including parameter setup
 * and file output. It is intended to be executed directly.
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateMapLayout } from './gen-map.js';
import type { GenMapParams } from './gen-map.js';

/**
 * Converts a 2D layout array into a nicely formatted string for JSON output.
 */
function formatLayoutForDisplay(layout: number[][]): string {
    const rows = layout.map(row => {
        const rowString = row.map(cell => String(cell).padStart(2, ' ')).join(', ');
        return `    [${rowString}]`;
    });
    return rows.join(',\n');
}

/**
 * Main function to run the map generator.
 */
function main() {
  // Parameters from user request
  const exampleParams: GenMapParams = {
    Width: 16,
    Height: 16,
    AreaNum: 4,
    LinkData: [[0, 1], [1, 2], [2, 3]],
    minAreaSize: {
      0: [4, 4],
      1: [3, 3],
      2: [3, 3]
    },
    mapAreaPos: {
      1: [[3, 3]],
    },
    outputFilename: 'generated_map.json',
    seed: 42,
  };

  console.log('Starting map generation with parameters:');
  console.log(JSON.stringify(exampleParams, null, 2));

  const { layout, areaGrid } = generateMapLayout(exampleParams);

  const tileAssetsString = JSON.stringify({ '0': 'map_floor', '1': 'map_wall' }, null, 2);
  const layoutString = formatLayoutForDisplay(layout);

  const outputString = `{
  "tileAssets": ${tileAssetsString},
  "layout": [
${layoutString}
  ]
}`;

  const outputPath = path.join('mapdata', exampleParams.outputFilename);
  fs.writeFileSync(outputPath, outputString);

  console.log(`\nMap successfully generated and saved to ${outputPath}`);
  logAreaDimensions(areaGrid, exampleParams.AreaNum);
}

/**
 * Calculates and logs the dimensions of each area in the grid.
 */
function logAreaDimensions(areaGrid: number[][], areaNum: number) {
    const bounds: Record<number, { minX: number, minY: number, maxX: number, maxY: number }> = {};
    for (let i = 0; i < areaNum; i++) { bounds[i] = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }; }
    const height = areaGrid.length;
    const width = areaGrid[0]?.length || 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const areaIndex = areaGrid[y][x];
            if (areaIndex !== -1 && bounds[areaIndex]) {
                const b = bounds[areaIndex];
                b.minX = Math.min(b.minX, x);
                b.minY = Math.min(b.minY, y);
                b.maxX = Math.max(b.maxX, x);
                b.maxY = Math.max(b.maxY, y);
            }
        }
    }
    console.log('\n--- Generated Area Dimensions ---');
    for (let i = 0; i < areaNum; i++) {
        const b = bounds[i];
        if (b.minX === Infinity) { console.log(`Area ${i}: Not generated`); }
        else {
            const w = b.maxX - b.minX + 1;
            const h = b.maxY - b.minY + 1;
            console.log(`Area ${i}: ${w} x ${h}`);
        }
    }
    console.log('---------------------------------');
}

main();
