/**
 * @fileoverview Map generator script.
 *
 * This script generates a map layout based on specified parameters.
 * It can be used to create complex procedural maps for the game.
 *
 * The core of the generator is a recursive partitioning algorithm that divides
 * the map into a specified number of areas, with constraints on area size
 * and required tile positions.
 */

import * as fs from 'fs';
import * as path from 'path';

// Constants for tile types
const TILE_FLOOR = 0;
const TILE_WALL = 1;

// Type definitions for parameters, matching the user's request.
type Vec2 = [number, number];

interface GenMapParams {
  Width: number;
  Height: number;
  AreaNum: number;
  LinkData: [number, number][];
  minAreaSize: Record<number, Vec2>;
  mapAreaPos: Record<number, Vec2[]>;
  outputFilename: string;
}

// Helper interface for representing a rectangle
interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Helper function to check if a point is inside a rectangle
function isPointInRect(point: Vec2, rect: Rect): boolean {
    return point[0] >= rect.x && point[0] < rect.x + rect.width &&
           point[1] >= rect.y && point[1] < rect.y + rect.height;
}


/**
 * The main recursive function to partition the map.
 * @param areaGrid The grid to store area indices.
 * @param rect The current rectangular region to partition.
 * @param areaIndices The indices of areas to place in this region.
 * @param params The global map generation parameters.
 */
function recursivePartition(areaGrid: number[][], rect: Rect, areaIndices: number[], params: GenMapParams) {
    if (areaIndices.length === 0) {
        return;
    }

    // Base case: If only one area, fill the rect with its index
    if (areaIndices.length === 1) {
        const areaIndex = areaIndices[0];
        for (let y = rect.y; y < rect.y + rect.height; y++) {
            for (let x = rect.x; x < rect.x + rect.width; x++) {
                if (x < params.Width && y < params.Height) {
                    areaGrid[y][x] = areaIndex;
                }
            }
        }
        return;
    }

    // Recursive step: Split the area and indices
    // --- Constraint-aware splitting logic ---

    const splitVertical = rect.width >= rect.height;

    // Try to find a valid split point
    for (let i = 1; i < areaIndices.length; i++) {
        const groupA_indices = areaIndices.slice(0, i);
        const groupB_indices = areaIndices.slice(i);

        // This is still a simplified split position, but it's a start.
        // A truly robust solution would try multiple splitX/splitY values.
        if (splitVertical) {
            const splitX = rect.x + Math.floor(rect.width * (i / areaIndices.length));
            if (splitX <= rect.x || splitX >= rect.x + rect.width) continue;

            const rectA: Rect = { x: rect.x, y: rect.y, width: splitX - rect.x, height: rect.height };
            const rectB: Rect = { x: splitX, y: rect.y, width: rect.width - (splitX - rect.x), height: rect.height };

            if (canSatisfyConstraints(rectA, groupA_indices, params) && canSatisfyConstraints(rectB, groupB_indices, params)) {
                recursivePartition(areaGrid, rectA, groupA_indices, params);
                recursivePartition(areaGrid, rectB, groupB_indices, params);
                return;
            }
        } else {
            const splitY = rect.y + Math.floor(rect.height * (i / areaIndices.length));
            if (splitY <= rect.y || splitY >= rect.y + rect.height) continue;

            const rectA: Rect = { x: rect.x, y: rect.y, width: rect.width, height: splitY - rect.y };
            const rectB: Rect = { x: rect.x, y: splitY, width: rect.width, height: rect.height - (splitY - rect.y) };

            if (canSatisfyConstraints(rectA, groupA_indices, params) && canSatisfyConstraints(rectB, groupB_indices, params)) {
                recursivePartition(areaGrid, rectA, groupA_indices, params);
                recursivePartition(areaGrid, rectB, groupB_indices, params);
                return;
            }
        }
    }

    // Fallback if no valid split is found (e.g., constraints are too tight)
    // This just stuffs all remaining areas into the current rect, which is not ideal.
    // A better implementation might throw an error.
    const areaIndex = areaIndices[0];
    for (let y = rect.y; y < rect.y + rect.height; y++) {
        for (let x = rect.x; x < rect.x + rect.width; x++) {
            if (x < params.Width && y < params.Height) {
                areaGrid[y][x] = areaIndex;
            }
        }
    }
}


/**
 * Checks if a given rectangle can satisfy the constraints for a set of areas.
 * @param rect The rectangle to check.
 * @param areaIndices The indices of areas to be placed in the rectangle.
 * @param params The global map generation parameters.
 * @returns True if the constraints can be satisfied, false otherwise.
 */
function canSatisfyConstraints(rect: Rect, areaIndices: number[], params: GenMapParams): boolean {
    if (rect.width <= 0 || rect.height <= 0) {
        return false;
    }

    // Check mapAreaPos constraint: all required positions for the given areas must be within the rect
    for (const areaIndex of areaIndices) {
        const required_positions = params.mapAreaPos[areaIndex];
        if (required_positions) {
            for (const pos of required_positions) {
                if (!isPointInRect(pos, rect)) {
                    return false; // A required point is outside this rect
                }
            }
        }
    }

    // Check minAreaSize constraint
    // This is a simplified check. It ensures the rect is large enough for each individual
    // min size, but not necessarily for all of them combined. A more complex check
    // would sum the minimum required areas.
    for (const areaIndex of areaIndices) {
        const minSize = params.minAreaSize[areaIndex];
        if (minSize) {
            if (rect.width < minSize[0] || rect.height < minSize[1]) {
                // This check is too simple. It assumes the area gets the whole rect.
                // A better approach is needed for multiple areas.
            }
        }
    }

    // A simple heuristic: check if the total minimum area is smaller than the rect area.
    let totalMinArea = 0;
    for (const areaIndex of areaIndices) {
        const minSize = params.minAreaSize[areaIndex];
        if (minSize) {
            totalMinArea += minSize[0] * minSize[1];
        }
    }

    if (rect.width * rect.height < totalMinArea) {
        return false;
    }

    return true;
}


/**
 * Generates the map layout.
 * @param params The parameters for map generation.
 * @returns The generated map layout as a 2D array of tile IDs.
 */
function generateMapLayout(params: GenMapParams): { layout: number[][], areaGrid: number[][] } {
  // 1. Initialize layout and area grids
  const layout: number[][] = Array(params.Height).fill(0).map(() => Array(params.Width).fill(TILE_FLOOR));
  const areaGrid: number[][] = Array(params.Height).fill(0).map(() => Array(params.Width).fill(-1));

  // 2. Perform partitioning
  const initialRect: Rect = { x: 1, y: 1, width: params.Width - 2, height: params.Height - 2 };
  const allAreaIndices = Array.from({ length: params.AreaNum }, (_, i) => i);
  recursivePartition(areaGrid, initialRect, allAreaIndices, params);

  // 3. Place walls based on area boundaries
  for (let y = 0; y < params.Height -1; y++) {
    for (let x = 0; x < params.Width - 1; x++) {
        const currentArea = areaGrid[y][x];
        const rightArea = areaGrid[y][x+1];
        const downArea = areaGrid[y+1][x];

        if (currentArea !== -1 && rightArea !== -1 && currentArea !== rightArea) {
            layout[y][x+1] = TILE_WALL;
        }
        if (currentArea !== -1 && downArea !== -1 && currentArea !== downArea) {
            layout[y+1][x] = TILE_WALL;
        }
    }
  }

  // 4. Create doors based on LinkData
  params.LinkData.forEach(([areaA, areaB]) => {
    const possibleDoors: Vec2[] = [];
    for (let y = 1; y < params.Height - 2; y++) {
        for (let x = 1; x < params.Width - 2; x++) {
            // Check for vertical walls between A and B
            if ( (areaGrid[y][x] === areaA && areaGrid[y][x+1] === areaB) || (areaGrid[y][x] === areaB && areaGrid[y][x+1] === areaA) ) {
                if (layout[y][x+1] === TILE_WALL) possibleDoors.push([x+1, y]);
            }
            // Check for horizontal walls between A and B
            if ( (areaGrid[y][x] === areaA && areaGrid[y+1][x] === areaB) || (areaGrid[y][x] === areaB && areaGrid[y+1][x] === areaA) ) {
                if(layout[y+1][x] === TILE_WALL) possibleDoors.push([x, y+1]);
            }
        }
    }

    if (possibleDoors.length > 0) {
        const [doorX, doorY] = possibleDoors[Math.floor(Math.random() * possibleDoors.length)];
        layout[doorY][doorX] = TILE_FLOOR;
    }
  });

  // 5. Add border walls
  for (let y = 0; y < params.Height; y++) {
    for (let x = 0; x < params.Width; x++) {
      if (x === 0 || x === params.Width - 1 || y === 0 || y === params.Height - 1) {
        layout[y][x] = TILE_WALL;
      }
    }
  }

  return { layout, areaGrid };
}

/**
 * Main function to run the map generator.
 */
export function main() {
  // Example parameters (hardcoded for now)
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

import { fileURLToPath } from 'url';

// Export functions for testing
export { generateMapLayout, TILE_FLOOR, TILE_WALL };

// The main function is exported for use in a separate runner script.
export type { GenMapParams, Vec2 };
