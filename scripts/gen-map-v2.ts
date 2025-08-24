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
export type TemplateConstraint = [number, number, number, number, number, number]; // minW, minH, maxW, maxH, minRoomNum, maxRoomNum

export interface GenMapV2Params {
  Width: number;
  Height: number;
  templates: RoomTemplate[];
  templateData: TemplateConstraint[];
  forceFloorPos: Vec2[];
  outputFilename: string;
  seed: number; // Seed for the random number generator
  doorDensity?: number; // Optional: 0 to 1, how many candidates become doors
}

export interface RoomTemplate {
  name: string;
  layout: number[][];
  width: number;
  height: number;
  roomNum: number;
}

// Helper function to create a PRNG
function createPRNG(seed: number): () => number {
    return function() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
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
        Width, Height, seed, forceFloorPos, templates, templateData,
        doorDensity = 0.5,
    } = params;
    const random = createPRNG(seed);

    const layout: number[][] = Array(Height).fill(0).map(() => Array(Width).fill(TILE_EMPTY));
    for (let y = 0; y < Height; y++) {
        for (let x = 0; x < Width; x++) {
            if (isOuterWall(x, y, Width, Height)) {
                layout[y][x] = TILE_WALL;
            }
        }
    }

    for (const constraint of templateData) {
        const [minW, minH, maxW, maxH, minRoomNum, maxRoomNum] = constraint;

        const filteredTemplates = templates.filter(t =>
            t.width >= minW && t.width <= maxW &&
            t.height >= minH && t.height <= maxH &&
            t.roomNum >= minRoomNum && t.roomNum <= maxRoomNum
        );

        if (filteredTemplates.length === 0) continue;

        const allValidPlacements: ValidPlacement[] = [];

        for (const template of filteredTemplates) {
            let templateWallCount = 0;
            for(const row of template.layout) {
                for(const tile of row) {
                    if (tile === TILE_WALL) templateWallCount++;
                }
            }
            if (templateWallCount === 0) continue; // Cannot place templates without walls

            for (let y = 0; y <= Height - template.height; y++) {
                for (let x = 0; x <= Width - template.width; x++) {
                    let weight = 0;
                    let overlapWallCount = 0;
                    let isValid = true;

                    for (let ty = 0; ty < template.height; ty++) {
                        for (let tx = 0; tx < template.width; tx++) {
                            const tile = template.layout[ty][tx];
                            if (tile === TILE_EMPTY) continue;

                            const mapX = x + tx;
                            const mapY = y + ty;
                            const mapTile = layout[mapY][mapX];

                            if (isForceFloor(mapX, mapY, forceFloorPos) && (tile === TILE_WALL || tile === TILE_DOOR_CANDIDATE)) {
                                isValid = false; break;
                            }

                            if (tile === TILE_WALL) {
                                if (mapTile !== TILE_WALL && mapTile !== TILE_EMPTY) {
                                    isValid = false; break;
                                }
                                if (mapTile === TILE_WALL) {
                                    weight += isOuterWall(mapX, mapY, Width, Height) ? 2 : 1;
                                    overlapWallCount++;
                                } else { // Placing a new wall, check for adjacent walls
                                    const neighbors = [[mapY - 1, mapX], [mapY + 1, mapX], [mapY, mapX - 1], [mapY, mapX + 1]];
                                    for (const [ny, nx] of neighbors) {
                                        if (nx > 0 && nx < Width - 1 && ny > 0 && ny < Height - 1 && layout[ny][nx] === TILE_WALL) {
                                            isValid = false; break;
                                        }
                                    }
                                }
                            }
                        }
                        if (!isValid) break;
                    }

                    // Rule 1: Placement must be valid based on above checks
                    // Rule 2: Overlap must be > 40% of template walls
                    if (isValid && overlapWallCount > (templateWallCount * 2 / 5)) {
                        allValidPlacements.push({ template, x, y, weight });
                    }
                }
            }
        }

        if (allValidPlacements.length === 0) continue;

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
                        layout[mapY][mapX] = TILE_WALL;
                    } else if (existingTile === TILE_DOOR_CANDIDATE) {
                        layout[mapY][mapX] = TILE_DOOR_CANDIDATE;
                    } else if (existingTile === TILE_WALL) {
                        layout[mapY][mapX] = TILE_WALL;
                    } else {
                        layout[mapY][mapX] = TILE_DOOR_CANDIDATE;
                    }
                } else {
                    layout[mapY][mapX] = templateTile;
                }
            }
        }
    }

    const doorCandidates: Vec2[] = [];
    for (let y = 0; y < Height; y++) {
        for (let x = 0; x < Width; x++) {
            if (layout[y][x] === TILE_EMPTY) {
                layout[y][x] = TILE_FLOOR;
            }
            if (layout[y][x] === TILE_DOOR_CANDIDATE) {
                doorCandidates.push([x, y]);
            }
        }
    }

    doorCandidates.forEach(([x, y]) => {
        if (random() < doorDensity) {
            layout[y][x] = TILE_FLOOR;
        } else {
            layout[y][x] = TILE_WALL;
        }
    });

    forceFloorPos.forEach(([x, y]) => {
        if (x > 0 && x < Width - 1 && y > 0 && y < Height - 1) {
            layout[y][x] = TILE_FLOOR;
        }
    });

    return { layout };
}
