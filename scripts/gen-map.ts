/**
 * @fileoverview Map generator script.
 *
 * This script provides the core logic for generating a map layout.
 * It is intended to be used as a library by a runner script.
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

    // Recursive step: Try to find a valid way to split the areas and the rectangle
    const splitVertical = rect.width > rect.height;

    // Iterate through possible split points of the rectangle
    const mainAxisLength = splitVertical ? rect.width : rect.height;
    for (let splitOffset = 1; splitOffset < mainAxisLength -1; splitOffset++) {
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

        // Given the split rectangles, classify which areas MUST go into which rectangle
        const mustGoInA: number[] = [];
        const mustGoInB: number[] = [];
        const canGoAnywhere: number[] = [];

        let possible = true;
        for (const areaIndex of areaIndices) {
            const requiredPos = params.mapAreaPos[areaIndex] || [];
            const isInA = requiredPos.every(p => isPointInRect(p, rectA));
            const isInB = requiredPos.every(p => isPointInRect(p, rectB));

            if (isInA && !isInB) {
                mustGoInA.push(areaIndex);
            } else if (!isInA && isInB) {
                mustGoInB.push(areaIndex);
            } else if (!isInA && !isInB && requiredPos.length > 0) {
                possible = false; // This split is impossible, required points are in neither child
                break;
            } else {
                canGoAnywhere.push(areaIndex);
            }
        }
        if (!possible) continue; // Try next split point

        // Now, try to distribute the "anywhere" areas to find a valid partition
        const remainingCount = canGoAnywhere.length;
        for (let i = 0; i < (1 << remainingCount); i++) { // Iterate through all subsets of canGoAnywhere
            const groupA_extra: number[] = [];
            const groupB_extra: number[] = [];

            for (let j = 0; j < remainingCount; j++) {
                if ((i & (1 << j)) > 0) {
                    groupA_extra.push(canGoAnywhere[j]);
                } else {
                    groupB_extra.push(canGoAnywhere[j]);
                }
            }

            const groupA = [...mustGoInA, ...groupA_extra];
            const groupB = [...mustGoInB, ...groupB_extra];

            if (groupA.length === 0 || groupB.length === 0) continue;

            if (canSatisfyConstraints(rectA, groupA, params) && canSatisfyConstraints(rectB, groupB, params)) {
                // Found a valid split! Recurse.
                recursivePartition(areaGrid, rectA, groupA, params);
                recursivePartition(areaGrid, rectB, groupB, params);
                return; // Exit after finding the first valid split
            }
        }
    }


    // Fallback if no valid split is found (e.g., constraints are too tight)
    // This just stuffs all remaining areas into the current rect, which is not ideal.
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

// Consolidate all exports here
export { generateMapLayout, TILE_FLOOR, TILE_WALL };
export type { GenMapParams, Vec2 };
