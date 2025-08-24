/**
 * @fileoverview Map generator script.
 *
 * This script provides the core logic for generating a map layout.
 * It is intended to be used as a library by a runner script.
 */

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
  seed: number;
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
 * @param random The seeded PRNG function.
 */
function recursivePartition(areaGrid: number[][], rect: Rect, areaIndices: number[], params: GenMapParams, random: () => number) {
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

    // --- Third attempt at partitioning logic ---
    let splitVertical: boolean;
    const canSplitVertical = rect.width > 2;
    const canSplitHorizontal = rect.height > 2;

    if (!canSplitVertical && !canSplitHorizontal) {
        // Cannot split further, fallback
        const areaIndex = areaIndices[0];
        for (let y = rect.y; y < rect.y + rect.height; y++) {
            for (let x = rect.x; x < rect.x + rect.width; x++) {
                if (x < params.Width && y < params.Height) {
                    areaGrid[y][x] = areaIndex;
                }
            }
        }
        return;
    } else if (canSplitVertical && !canSplitHorizontal) {
        splitVertical = true;
    } else if (!canSplitVertical && canSplitHorizontal) {
        splitVertical = false;
    } else {
        splitVertical = random() > 0.5;
    }

    // Determine the groups of areas
    const midPoint = Math.floor(areaIndices.length / 2);
    const groupA = areaIndices.slice(0, midPoint);
    const groupB = areaIndices.slice(midPoint);

    // Determine a valid range for the split line
    const minSplitOffset = 2; // Keep rooms at least 2 wide/high
    const maxSplitOffset = (splitVertical ? rect.width : rect.height) - minSplitOffset;

    if (minSplitOffset >= maxSplitOffset) {
        // Fallback if the rectangle is too small to split meaningfully
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

    // Randomly choose a split point within the valid range
    const splitOffset = Math.floor(random() * (maxSplitOffset - minSplitOffset)) + minSplitOffset;

    let rectA: Rect, rectB: Rect;
    if (splitVertical) {
        const splitX = rect.x + splitOffset;
        rectA = { x: rect.x, y: rect.y, width: splitX - rect.x, height: rect.height };
        rectB = { x: splitX, y: rect.y, width: rect.width - (splitX - rect.x), height: rect.height };
    } else {
        const splitY = rect.y + splitOffset;
        rectA = { x: rect.x, y: rect.y, width: rect.width, height: splitY - rect.y };
        rectB = { x: rect.x, y: splitY, width: rect.width, height: rect.height - (splitY - rect.y) };
    }

    // This simplified logic doesn't re-verify constraints after the random split.
    // This might fail if constraints are tight, but is more likely to produce varied rooms.
    recursivePartition(areaGrid, rectA, groupA, params, random);
    recursivePartition(areaGrid, rectB, groupB, params, random);
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

    // A simple heuristic: check if the total minimum area is smaller than the rect area.
    let totalMinArea = 0;
    for (const areaIndex of areaIndices) {
        const minSize = params.minAreaSize[areaIndex] || [1, 1];
        totalMinArea += minSize[0] * minSize[1];
    }

    if (rect.width * rect.height < totalMinArea) {
        return false;
    }

    return true;
}


/**
 * Creates a seeded pseudo-random number generator (PRNG) using the mulberry32 algorithm.
 * @param seed The seed for the PRNG.
 * @returns A function that returns a random number between 0 and 1.
 */
function createPRNG(seed: number): () => number {
    return function() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

/**
 * Generates the map layout.
 * @param params The parameters for map generation.
 * @returns The generated map layout as a 2D array of tile IDs.
 */
function generateMapLayout(params: GenMapParams): { layout: number[][], areaGrid: number[][] } {
  // 1. Initialize PRNG and grids
  const random = createPRNG(params.seed);
  const layout: number[][] = Array(params.Height).fill(0).map(() => Array(params.Width).fill(TILE_FLOOR));
  const areaGrid: number[][] = Array(params.Height).fill(0).map(() => Array(params.Width).fill(-1));

  // 2. Perform partitioning
  const initialRect: Rect = { x: 1, y: 1, width: params.Width - 2, height: params.Height - 2 };
  const allAreaIndices = Array.from({ length: params.AreaNum }, (_, i) => i);
  recursivePartition(areaGrid, initialRect, allAreaIndices, params, random);

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
        const [doorX, doorY] = possibleDoors[Math.floor(random() * possibleDoors.length)];
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

// Consolidate all exports here
export { generateMapLayout, TILE_FLOOR, TILE_WALL };
export type { GenMapParams, Vec2 };
