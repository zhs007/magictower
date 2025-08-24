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
 * Main function to run the map generator.
 */
function main() {
  // Example parameters
  const exampleParams: GenMapParams = {
    Width: 32,
    Height: 32,
    AreaNum: 4,
    LinkData: [[0, 1], [1, 2], [2, 3]],
    minAreaSize: {
      0: [4, 4],
    },
    mapAreaPos: {
      1: [[10, 10]],
    },
    outputFilename: 'generated_map.json',
  };

  console.log('Starting map generation with parameters:');
  console.log(JSON.stringify(exampleParams, null, 2));

  const { layout } = generateMapLayout(exampleParams);

  const output = {
    tileAssets: {
      '0': 'map_floor',
      '1': 'map_wall',
    },
    layout: layout,
  };

  const outputPath = path.join('mapdata', exampleParams.outputFilename);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`Map successfully generated and saved to ${outputPath}`);
}

main();
