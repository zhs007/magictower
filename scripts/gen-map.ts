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
 * Finds a valid way to partition a set of areas based on connectivity.
 * @param areas The list of area indices to partition.
 * @param allLinks The global link data.
 * @param random The seeded PRNG.
 * @returns A tuple containing two arrays, representing the two partitioned groups.
 */
function findValidPartition(areas: number[], allLinks: [number, number][], random: () => number): [number[], number[]] {
    if (areas.length <= 1) {
        return [areas, []];
    }

    const areaSet = new Set(areas);
    const adj: Record<number, number[]> = {};
    areas.forEach(area => adj[area] = []);

    // Build adjacency list for the current subset of areas
    allLinks.forEach(([u, v]) => {
        if (areaSet.has(u) && areaSet.has(v)) {
            adj[u].push(v);
            adj[v].push(u);
        }
    });

    const groupA = new Set<number>();
    const startNode = areas[Math.floor(random() * areas.length)];
    const queue = [startNode];
    const visited = new Set([startNode]);
    groupA.add(startNode);

    // Randomly decide the size of the first group
    const groupASize = Math.floor(random() * (areas.length - 1)) + 1;

    // Perform a BFS to find a connected component of the target size
    while (queue.length > 0 && groupA.size < groupASize) {
        const u = queue.shift()!;
        // Shuffle neighbors to add randomness
        const neighbors = adj[u].sort(() => random() - 0.5);
        for (const v of neighbors) {
            if (!visited.has(v)) {
                visited.add(v);
                groupA.add(v);
                queue.push(v);
                if (groupA.size >= groupASize) break;
            }
        }
    }

    const groupA_array = Array.from(groupA);
    const groupB_array = areas.filter(area => !groupA.has(area));

    if (groupA_array.length === 0 || groupB_array.length === 0) {
        // Fallback for disconnected graphs or other edge cases
        const mid = Math.floor(areas.length / 2);
        return [areas.slice(0, mid), areas.slice(mid)];
    }

    return [groupA_array, groupB_array];
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

    const [groupA, groupB] = findValidPartition(areaIndices, params.LinkData, random);

    // Attempt to find a valid split
    for (let i = 0; i < 10; i++) {
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

        // Validate that constrained positions are respected by this split
        const groupA_constrained = groupA.filter(a => params.mapAreaPos[a]);
        const groupB_constrained = groupB.filter(a => params.mapAreaPos[a]);

        const isA_valid = groupA_constrained.every(a => params.mapAreaPos[a].every(p => isPointInRect(p, rectA)));
        const isB_valid = groupB_constrained.every(a => params.mapAreaPos[a].every(p => isPointInRect(p, rectB)));

        if (isA_valid && isB_valid) {
            recursivePartition(areaGrid, rectA, groupA, params, random);
            recursivePartition(areaGrid, rectB, groupB, params, random);
            return;
        }
    }

    // Fallback if no valid split found
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

  // --- Perturb Walls (v2) ---
  const wallSegments = findWallSegments(layout, areaGrid);

  wallSegments.forEach(segment => {
    if (random() > 0.5) { // 50% chance to perturb a segment
        const len = segment.orientation === 'V' ? segment.end[1] - segment.start[1] : segment.end[0] - segment.start[0];
        if (len < 3) return; // Too short to bend

        const bendIndex = Math.floor(random() * (len - 2)) + 1; // Pick a bend point (not at the ends)
        const pushDist = random() > 0.7 ? 2 : 1; // Push by 1 or 2 tiles
        const pushDir = random() > 0.5 ? 1 : -1;

        let segmentToMove: Vec2[];
        let hingePoint: Vec2;

        if (segment.orientation === 'V') {
            hingePoint = [segment.start[0], segment.start[1] + bendIndex];
            segmentToMove = [];
            for (let y = hingePoint[1] + 1; y <= segment.end[1]; y++) {
                segmentToMove.push([segment.start[0], y]);
            }
        } else { // Horizontal
            hingePoint = [segment.start[0] + bendIndex, segment.start[1]];
            segmentToMove = [];
            for (let x = hingePoint[0] + 1; x <= segment.end[0]; x++) {
                segmentToMove.push([x, segment.start[1]]);
            }
        }

        // Validate the move
        const isValid = segmentToMove.every(([x, y]) => {
            const targetX = x + (segment.orientation === 'V' ? pushDir : 0);
            const targetY = y + (segment.orientation === 'H' ? pushDir : 0);
            if (targetX < 0 || targetX >= params.Width || targetY < 0 || targetY >= params.Height) return false;
            // More complex validation needed here in a real scenario
            return layout[targetY][targetX] === TILE_FLOOR;
        });

        if (isValid) {
            // Execute the move
            segmentToMove.forEach(([x, y]) => {
                layout[y][x] = TILE_FLOOR;
                if (segment.orientation === 'V') {
                    layout[y][x + pushDir] = TILE_WALL;
                } else {
                    layout[y + pushDir][x] = TILE_WALL;
                }
            });
            // Draw the hinge
            if (segment.orientation === 'V') {
                layout[hingePoint[1]][hingePoint[0] + pushDir] = TILE_WALL;
            } else {
                layout[hingePoint[1] + pushDir][hingePoint[0]] = TILE_WALL;
            }
        }
    }
  });

  // 4. Create doors based on LinkData
  const doorLinks = new Map<string, Vec2[]>();
  params.LinkData.forEach(link => {
      const key = link.sort().join(',');
      doorLinks.set(key, []);
  });

  for (let y = 1; y < params.Height - 1; y++) {
    for (let x = 1; x < params.Width - 1; x++) {
        if (layout[y][x] !== TILE_WALL) continue;

        const neighborAreas = new Set<number>();
        if (areaGrid[y-1][x] !== -1) neighborAreas.add(areaGrid[y-1][x]);
        if (areaGrid[y+1][x] !== -1) neighborAreas.add(areaGrid[y+1][x]);
        if (areaGrid[y][x-1] !== -1) neighborAreas.add(areaGrid[y][x-1]);
        if (areaGrid[y][x+1] !== -1) neighborAreas.add(areaGrid[y][x+1]);

        if (neighborAreas.size === 2) {
            const [areaA, areaB] = Array.from(neighborAreas);
            const key = [areaA, areaB].sort().join(',');
            if (doorLinks.has(key)) {
                doorLinks.get(key)!.push([x, y]);
            }
        }
    }
  }

  doorLinks.forEach(possibleDoors => {
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

interface WallSegment {
    start: Vec2;
    end: Vec2;
    orientation: 'V' | 'H';
}

function findWallSegments(layout: number[][], areaGrid: number[][]): WallSegment[] {
    const segments: WallSegment[] = [];
    const height = layout.length;
    const width = layout[0]?.length || 0;
    const visited: boolean[][] = Array(height).fill(0).map(() => Array(width).fill(false));

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            if (layout[y][x] === TILE_WALL && !visited[y][x]) {
                const area1 = areaGrid[y][x-1];
                const area2 = areaGrid[y][x+1];
                // Check for vertical segment
                if (area1 !== -1 && area2 !== -1 && area1 !== area2) {
                    let endY = y;
                    while (endY + 1 < height -1 && layout[endY+1][x] === TILE_WALL && areaGrid[endY+1][x-1] === area1 && areaGrid[endY+1][x+1] === area2) {
                        endY++;
                    }
                    if (endY > y) {
                        segments.push({ start: [x, y], end: [x, endY], orientation: 'V' });
                        for(let i = y; i <= endY; i++) visited[i][x] = true;
                    }
                }

                const area3 = areaGrid[y-1][x];
                const area4 = areaGrid[y+1][x];
                 // Check for horizontal segment
                if (area3 !== -1 && area4 !== -1 && area3 !== area4) {
                    let endX = x;
                    while (endX + 1 < width -1 && layout[y][endX+1] === TILE_WALL && areaGrid[y-1][endX+1] === area3 && areaGrid[y+1][endX+1] === area4) {
                        endX++;
                    }
                     if (endX > x) {
                        segments.push({ start: [x, y], end: [endX, y], orientation: 'H' });
                        for(let i = x; i <= endX; i++) visited[y][i] = true;
                    }
                }
            }
        }
    }
    return segments;
}

// Consolidate all exports here
export { generateMapLayout, TILE_FLOOR, TILE_WALL };
export type { GenMapParams, Vec2 };
