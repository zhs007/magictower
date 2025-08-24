/**
 * @fileoverview Map generator script (V2).
 *
 * This script provides the core logic for generating a map layout
 * based on a template-matching algorithm.
 */

// Constants for tile types
export const TILE_FLOOR = 0;
export const TILE_WALL = 1;
export const TILE_EMPTY = -1;
export const TILE_DOOR_CANDIDATE = -2;

// Type definitions
export type Vec2 = [number, number];

export interface GenMapV2Params {
  Width: number;
  Height: number;
  templateData: any[]; // This parameter is complex and will be handled later.
  forceFloorPos: Vec2[];
  outputFilename: string;
  seed: number; // Seed for the random number generator
  doorDensity?: number; // Optional: 0 to 1, how many candidates become doors
  maxPlacementAttempts?: number; // Optional: How many times to try placing templates
}

export interface RoomTemplate {
  name: string;
  layout: number[][];
  width: number;
  height: number;
}

// A simple, hardcoded library of room templates.
// 0=floor, 1=wall, -1=empty, -2=door candidate
const TEMPLATE_LIBRARY: RoomTemplate[] = [
  {
    name: '3x3 Room', width: 3, height: 3,
    layout: [[1, -2, 1], [1, 0, 1], [1, 1, 1]],
  },
  {
    name: '5x5 Room', width: 5, height: 5,
    layout: [
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1],
      [1, -2, 1, -2, 1],
    ],
  },
  {
    name: '5x4 Room', width: 5, height: 4,
    layout: [
        [1, 1, -2, 1, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 1, 1, 1, 1],
    ]
  },
  {
    name: 'L-shape 4x4', width: 4, height: 4,
    layout: [
        [1, 1, 1, 1],
        [1, 0, 0, 1],
        [1, 0, 1, -1],
        [1, -2, 1, -1],
    ]
  }
];

// Helper function to create a PRNG
function createPRNG(seed: number): () => number {
    return function() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// Helper to find all contiguous empty regions
function findEmptyRegions(layout: number[][], width: number, height: number): Vec2[][] {
    const regions: Vec2[][] = [];
    const visited: boolean[][] = Array(height).fill(0).map(() => Array(width).fill(false));

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (layout[y][x] === TILE_EMPTY && !visited[y][x]) {
                const region: Vec2[] = [];
                const queue: Vec2[] = [[x, y]];
                visited[y][x] = true;
                while (queue.length > 0) {
                    const [cx, cy] = queue.shift()!;
                    region.push([cx, cy]);
                    const neighbors: Vec2[] = [[cx, cy - 1], [cx, cy + 1], [cx - 1, cy], [cx + 1, cy]];
                    for (const [nx, ny] of neighbors) {
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height &&
                            layout[ny][nx] === TILE_EMPTY && !visited[ny][nx]) {
                            visited[ny][nx] = true;
                            queue.push([nx, ny]);
                        }
                    }
                }
                regions.push(region);
            }
        }
    }
    return regions;
}

// Helper to check if a position is a forced floor
function isForceFloor(x: number, y: number, forceFloorPos: Vec2[]): boolean {
    return forceFloorPos.some(p => p[0] === x && p[1] === y);
}

// Helper to determine if a wall is an "outer" wall
function isOuterWall(x: number, y: number, width: number, height: number): boolean {
    return x === 0 || x === width - 1 || y === 0 || y === height - 1;
}

interface ValidPlacement {
    template: RoomTemplate;
    x: number; // Top-left x on the map
    y: number; // Top-left y on the map
    weight: number;
}

/**
 * Generates a map layout using the V2 template-based algorithm.
 */
export function generateMapV2(params: GenMapV2Params): { layout: number[][] } {
    const {
        Width, Height, seed, forceFloorPos,
        doorDensity = 0.5,
        maxPlacementAttempts = 100
    } = params;
    const random = createPRNG(seed);

    // 1. Initialize map with empty space and a wall border
    const layout: number[][] = Array(Height).fill(0).map(() => Array(Width).fill(TILE_EMPTY));
    for (let y = 0; y < Height; y++) {
        for (let x = 0; x < Width; x++) {
            if (isOuterWall(x, y, Width, Height)) {
                layout[y][x] = TILE_WALL;
            }
        }
    }

    // Main placement loop
    for (let attempt = 0; attempt < maxPlacementAttempts; attempt++) {
        const regions = findEmptyRegions(layout, Width, Height);
        if (regions.length === 0) break;

        regions.sort((a, b) => b.length - a.length);
        const largestRegion = regions[0];

        const allValidPlacements: ValidPlacement[] = [];

        // Try every template
        for (const template of TEMPLATE_LIBRARY) {
            // Try every possible top-left position on the map
            for (let y = 0; y <= Height - template.height; y++) {
                for (let x = 0; x <= Width - template.width; x++) {
                    let weight = 0;
                    let isValid = true;

                    // Check if this placement is valid
                    for (let ty = 0; ty < template.height; ty++) {
                        for (let tx = 0; tx < template.width; tx++) {
                            const tile = template.layout[ty][tx];
                            if (tile === TILE_EMPTY) continue; // -1 is ignored

                            const mapX = x + tx;
                            const mapY = y + ty;
                            const mapTile = layout[mapY][mapX];

                            // Rule: forceFloorPos must not be a wall or door
                            if (isForceFloor(mapX, mapY, forceFloorPos) && (tile === TILE_WALL || tile === TILE_DOOR_CANDIDATE)) {
                                isValid = false; break;
                            }

                            // Rule: Template walls must overlap with existing walls
                            if (tile === TILE_WALL) {
                                if (mapTile !== TILE_WALL && mapTile !== TILE_EMPTY) {
                                    isValid = false; break;
                                }
                                // If it overlaps a wall, calculate weight
                                if (mapTile === TILE_WALL) {
                                    weight += isOuterWall(mapX, mapY, Width, Height) ? 2 : 1;
                                }
                            }
                        }
                        if (!isValid) break;
                    }

                    if (isValid && weight > 0) { // Require at least one wall to overlap
                        allValidPlacements.push({ template, x, y, weight });
                    }
                }
            }
        }

        if (allValidPlacements.length === 0) break; // No more valid placements found

        // Weighted random selection
        const totalWeight = allValidPlacements.reduce((sum, p) => sum + p.weight, 0);
        let randomWeight = random() * totalWeight;
        let chosenPlacement: ValidPlacement | null = null;
        for (const placement of allValidPlacements) {
            randomWeight -= placement.weight;
            if (randomWeight <= 0) {
                chosenPlacement = placement;
                break;
            }
        }
        if (!chosenPlacement) chosenPlacement = allValidPlacements[allValidPlacements.length - 1];

        // Place the chosen template onto the map
        const { template, x, y } = chosenPlacement;
        for (let ty = 0; ty < template.height; ty++) {
            for (let tx = 0; tx < template.width; tx++) {
                const templateTile = template.layout[ty][tx];
                if (templateTile === TILE_EMPTY) continue;

                const mapX = x + tx;
                const mapY = y + ty;
                const existingTile = layout[mapY][mapX];

                if (templateTile === TILE_DOOR_CANDIDATE) {
                    if (isOuterWall(mapX, mapY, Width, Height)) {
                        layout[mapY][mapX] = TILE_WALL; // Doors on outer wall become walls
                    } else if (existingTile === TILE_DOOR_CANDIDATE) {
                        layout[mapY][mapX] = TILE_DOOR_CANDIDATE; // Keep door if both are doors
                    } else if (existingTile === TILE_WALL) {
                        layout[mapY][mapX] = TILE_WALL; // Becomes wall if hitting existing wall
                    }
                     else {
                        layout[mapY][mapX] = TILE_DOOR_CANDIDATE; // Place new door candidate
                    }
                } else {
                    layout[mapY][mapX] = templateTile;
                }
            }
        }
    }

    // 4. Finalization
    const doorCandidates: Vec2[] = [];
    for (let y = 0; y < Height; y++) {
        for (let x = 0; x < Width; x++) {
            // Finalize public areas
            if (layout[y][x] === TILE_EMPTY) {
                layout[y][x] = TILE_FLOOR;
            }
            // Collect door candidates
            if (layout[y][x] === TILE_DOOR_CANDIDATE) {
                doorCandidates.push([x, y]);
            }
        }
    }

    // Finalize doors
    doorCandidates.forEach(([x, y]) => {
        if (random() < doorDensity) {
            layout[y][x] = TILE_FLOOR; // Becomes a door (floor tile)
        } else {
            layout[y][x] = TILE_WALL; // Becomes a wall
        }
    });

    // Ensure forceFloorPos are floors
    forceFloorPos.forEach(([x, y]) => {
        if (x > 0 && x < Width - 1 && y > 0 && y < Height - 1) {
            layout[y][x] = TILE_FLOOR;
        }
    });

    return { layout };
}
