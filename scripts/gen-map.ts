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
 * The main recursive function to partition the map. This function's only job
 * is to populate the areaGrid with area indices.
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

    if (areaIndices.length === 1) {
        const areaIndex = areaIndices[0];
        for (let y = rect.y; y < rect.y + rect.height; y++) {
            for (let x = rect.x; x < rect.x + rect.width; x++) {
                if (x >= 0 && x < params.Width && y >= 0 && y < params.Height) {
                    areaGrid[y][x] = areaIndex;
                }
            }
        }
        return;
    }

    // Attempt to find a valid split
    for (let i = 0; i < 10; i++) { // Try up to 10 times to find a valid split
        let splitVertical: boolean;
        const canSplitVertical = rect.width > 2;
        const canSplitHorizontal = rect.height > 2;

        if (!canSplitVertical && !canSplitHorizontal) break;
        if (canSplitVertical && !canSplitHorizontal) splitVertical = true;
        else if (!canSplitVertical && canSplitHorizontal) splitVertical = false;
        else splitVertical = random() > 0.5;

        const minSplitOffset = 2;
        const maxSplitOffset = (splitVertical ? rect.width : rect.height) - minSplitOffset;
        if (minSplitOffset >= maxSplitOffset) continue;

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

        const mustGoInA: number[] = [];
        const mustGoInB: number[] = [];
        const unconstrained: number[] = [];
        let possible = true;

        for (const areaIndex of areaIndices) {
            const requiredPos = params.mapAreaPos[areaIndex] || [];
            const inA = requiredPos.every(p => isPointInRect(p, rectA));
            const inB = requiredPos.every(p => isPointInRect(p, rectB));

            if (inA) mustGoInA.push(areaIndex);
            else if (inB) mustGoInB.push(areaIndex);
            else if (requiredPos.length > 0) { possible = false; break; }
            else unconstrained.push(areaIndex);
        }
        if (!possible) continue;

        // Randomly distribute unconstrained areas
        unconstrained.forEach(areaIndex => {
            if (mustGoInA.length < areaIndices.length / 2 && random() > 0.5) {
                mustGoInA.push(areaIndex);
            } else {
                mustGoInB.push(areaIndex);
            }
        });

        if (mustGoInA.length > 0 && mustGoInB.length > 0) {
            recursivePartition(areaGrid, rectA, mustGoInA, params, random);
            recursivePartition(areaGrid, rectB, mustGoInB, params, random);
            return;
        }
    }

    // Fallback if no valid split found
    const mid = Math.floor(areaIndices.length / 2);
    const groupA = areaIndices.slice(0, mid);
    const groupB = areaIndices.slice(mid);
    const fallbackSplitVertical = rect.width > rect.height;
    const splitOffset = Math.floor((fallbackSplitVertical ? rect.width : rect.height) / 2);
    let rectA: Rect, rectB: Rect;
     if (fallbackSplitVertical) {
        const splitX = rect.x + splitOffset;
        rectA = { x: rect.x, y: rect.y, width: splitX - rect.x, height: rect.height };
        rectB = { x: splitX, y: rect.y, width: rect.width - (splitX - rect.x), height: rect.height };
    } else {
        const splitY = rect.y + splitOffset;
        rectA = { x: rect.x, y: rect.y, width: rect.width, height: splitY - rect.y };
        rectB = { x: rect.x, y: splitY, width: rect.width, height: rect.height - (splitY - rect.y) };
    }
    recursivePartition(areaGrid, rectA, groupA, params, random);
    recursivePartition(areaGrid, rectB, groupB, params, random);
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

  // 2. Perform partitioning to fill areaGrid
  const initialRect: Rect = { x: 1, y: 1, width: params.Width - 2, height: params.Height - 2 };
  const allAreaIndices = Array.from({ length: params.AreaNum }, (_, i) => i);
  recursivePartition(areaGrid, initialRect, allAreaIndices, params, random);

  // 3. Draw walls based on area boundaries
  for (let y = 0; y < params.Height - 1; y++) {
    for (let x = 0; x < params.Width - 1; x++) {
        const area1 = areaGrid[y][x];
        const area2 = areaGrid[y][x+1];
        const area3 = areaGrid[y+1][x];
        if (area1 !== -1 && area2 !== -1 && area1 !== area2) {
            layout[y][x+1] = TILE_WALL;
        }
        if (area1 !== -1 && area3 !== -1 && area1 !== area3) {
            layout[y+1][x] = TILE_WALL;
        }
    }
  }

  // --- Perturb Walls ---
  for (let y = 1; y < params.Height - 2; y++) {
    for (let x = 1; x < params.Width - 2; x++) {
        // Find a vertical wall segment
        if (layout[y][x] === TILE_WALL && layout[y+1][x] === TILE_WALL) {
            if (random() > 0.7) { // Chance to perturb
                const areaLeft = areaGrid[y][x-1];
                const areaRight = areaGrid[y][x+1];
                if (areaLeft !== -1 && areaRight !== -1 && areaLeft !== areaRight) {
                    const pushDir = random() > 0.5 ? 1 : -1; // Push right or left
                    if (areaGrid[y][x+pushDir] === (pushDir === 1 ? areaRight : areaLeft)) {
                         layout[y][x] = TILE_FLOOR;
                         layout[y][x+pushDir] = TILE_WALL;
                    }
                }
            }
        }
         // Find a horizontal wall segment
        if (layout[y][x] === TILE_WALL && layout[y][x+1] === TILE_WALL) {
             if (random() > 0.7) { // Chance to perturb
                const areaUp = areaGrid[y-1][x];
                const areaDown = areaGrid[y+1][x];
                 if (areaUp !== -1 && areaDown !== -1 && areaUp !== areaDown) {
                    const pushDir = random() > 0.5 ? 1 : -1; // Push down or up
                    if (areaGrid[y+pushDir][x] === (pushDir === 1 ? areaDown : areaUp)) {
                         layout[y][x] = TILE_FLOOR;
                         layout[y+pushDir][x] = TILE_WALL;
                    }
                }
            }
        }
    }
  }

  // 4. Create doors based on LinkData
  params.LinkData.forEach(([areaA, areaB]) => {
    const possibleDoors: Vec2[] = [];
    // This logic needs to be aware of the new wall layout
    for (let y = 1; y < params.Height - 2; y++) {
        for (let x = 1; x < params.Width - 2; x++) {
            const currentArea = areaGrid[y][x];
            if (layout[y][x+1] === TILE_WALL && ((currentArea === areaA && areaGrid[y][x+2] === areaB) || (currentArea === areaB && areaGrid[y][x+2] === areaA))) {
                possibleDoors.push([x+1, y]);
            }
             if (layout[y+1][x] === TILE_WALL && ((currentArea === areaA && areaGrid[y+2][x] === areaB) || (currentArea === areaB && areaGrid[y+2][x] === areaA))) {
                possibleDoors.push([x, y+1]);
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
