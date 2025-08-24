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

  let attempts = 0;
  const maxAttempts = 100;
  let finalLayout: number[][] | null = null;
  let finalAreaGrid: number[][] | null = null;
  let success = false;

  while (attempts < maxAttempts && !success) {
    attempts++;
    const currentSeed = exampleParams.seed + attempts - 1;
    console.log(`\n--- Generation Attempt ${attempts} (Seed: ${currentSeed}) ---`);
    const { layout, areaGrid } = generateMapLayout({ ...exampleParams, seed: currentSeed});

    if (verifyAllConstraints(areaGrid, exampleParams)) {
        success = true;
        finalLayout = layout;
        finalAreaGrid = areaGrid;
        console.log("Successfully generated a valid map!");
    } else {
        console.log("Constraint check failed. Retrying...");
    }
  }

  if (success && finalLayout && finalAreaGrid) {
    const tileAssetsString = JSON.stringify({ '0': 'map_floor', '1': 'map_wall' }, null, 2);
    const layoutString = formatLayoutForDisplay(finalLayout);

    const outputString = `{
  "tileAssets": ${tileAssetsString},
  "layout": [
${layoutString}
  ]
}`;

    const outputPath = path.join('mapdata', exampleParams.outputFilename);
    fs.writeFileSync(outputPath, outputString);

    console.log(`\nMap successfully generated and saved to ${outputPath}`);
    logAreaDimensions(finalAreaGrid, exampleParams.AreaNum);
  } else {
    console.error(`\nFailed to generate a valid map after ${maxAttempts} attempts.`);
  }
}

function getAreaBounds(areaGrid: number[][], areaNum: number): Record<number, { minX: number, minY: number, maxX: number, maxY: number }> {
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
    return bounds;
}


/**
 * Calculates and logs the dimensions of each area in the grid.
 */
function logAreaDimensions(areaGrid: number[][], areaNum: number) {
    const bounds = getAreaBounds(areaGrid, areaNum);
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

/**
 * Verifies all constraints (connectivity, min size, required positions).
 */
function verifyAllConstraints(areaGrid: number[][], params: GenMapParams): boolean {
    console.log('--- Verifying All Constraints ---');
    let allOk = true;

    // 1. Verify Connectivity
    for (const link of params.LinkData) {
        const [areaA, areaB] = link;
        let isAdjacent = false;
        for (let y = 0; y < areaGrid.length - 1; y++) {
            for (let x = 0; x < areaGrid[0].length - 1; x++) {
                const current = areaGrid[y][x];
                const right = areaGrid[y][x+1];
                const down = areaGrid[y+1][x];
                if ((current === areaA && (right === areaB || down === areaB)) || (current === areaB && (right === areaA || down === areaA))) {
                    isAdjacent = true;
                    break;
                }
            }
            if (isAdjacent) break;
        }
        if (!isAdjacent) {
            console.log(`Connectivity FAIL: Link [${areaA}, ${areaB}] are not adjacent.`);
            allOk = false;
        }
    }

    // 2. Verify mapAreaPos
    for (const areaIndexStr in params.mapAreaPos) {
        const areaIndex = parseInt(areaIndexStr, 10);
        const positions = params.mapAreaPos[areaIndex];
        for (const pos of positions) {
            const [x, y] = pos;
            if (areaGrid[y][x] !== areaIndex) {
                 console.log(`mapAreaPos FAIL: Pos [${x},${y}] is in area ${areaGrid[y][x]} but should be in ${areaIndex}.`);
                 allOk = false;
            }
        }
    }

    // 3. Verify minAreaSize
    const bounds = getAreaBounds(areaGrid, params.AreaNum);
     for (const areaIndexStr in params.minAreaSize) {
        const areaIndex = parseInt(areaIndexStr, 10);
        const minSize = params.minAreaSize[areaIndex];
        const b = bounds[areaIndex];
        if (b.minX === Infinity) {
             console.log(`minAreaSize FAIL: Area ${areaIndex} was not generated.`);
             allOk = false;
             continue;
        }
        const w = b.maxX - b.minX + 1;
        const h = b.maxY - b.minY + 1;
        if (w < minSize[0] || h < minSize[1]) {
            console.log(`minAreaSize FAIL: Area ${areaIndex} is ${w}x${h}, smaller than required ${minSize[0]}x${minSize[1]}.`);
            allOk = false;
        }
    }

    return allOk;
}


main();
