"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TILE_WALL = exports.TILE_FLOOR = void 0;
exports.generateMapLayout = generateMapLayout;
var fs = require("fs");
var path = require("path");
// Constants for tile types
var TILE_FLOOR = 0;
exports.TILE_FLOOR = TILE_FLOOR;
var TILE_WALL = 1;
exports.TILE_WALL = TILE_WALL;
// Helper function to check if a point is inside a rectangle
function isPointInRect(point, rect) {
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
function recursivePartition(areaGrid, rect, areaIndices, params) {
    if (areaIndices.length === 0) {
        return;
    }
    // Base case: If only one area, fill the rect with its index
    if (areaIndices.length === 1) {
        var areaIndex_1 = areaIndices[0];
        for (var y = rect.y; y < rect.y + rect.height; y++) {
            for (var x = rect.x; x < rect.x + rect.width; x++) {
                if (x < params.Width && y < params.Height) {
                    areaGrid[y][x] = areaIndex_1;
                }
            }
        }
        return;
    }
    // Recursive step: Split the area and indices
    // --- Constraint-aware splitting logic ---
    var splitVertical = rect.width >= rect.height;
    // Try to find a valid split point
    for (var i = 1; i < areaIndices.length; i++) {
        var groupA_indices = areaIndices.slice(0, i);
        var groupB_indices = areaIndices.slice(i);
        // This is still a simplified split position, but it's a start.
        // A truly robust solution would try multiple splitX/splitY values.
        if (splitVertical) {
            var splitX = rect.x + Math.floor(rect.width * (i / areaIndices.length));
            if (splitX <= rect.x || splitX >= rect.x + rect.width)
                continue;
            var rectA = { x: rect.x, y: rect.y, width: splitX - rect.x, height: rect.height };
            var rectB = { x: splitX, y: rect.y, width: rect.width - (splitX - rect.x), height: rect.height };
            if (canSatisfyConstraints(rectA, groupA_indices, params) && canSatisfyConstraints(rectB, groupB_indices, params)) {
                recursivePartition(areaGrid, rectA, groupA_indices, params);
                recursivePartition(areaGrid, rectB, groupB_indices, params);
                return;
            }
        }
        else {
            var splitY = rect.y + Math.floor(rect.height * (i / areaIndices.length));
            if (splitY <= rect.y || splitY >= rect.y + rect.height)
                continue;
            var rectA = { x: rect.x, y: rect.y, width: rect.width, height: splitY - rect.y };
            var rectB = { x: rect.x, y: splitY, width: rect.width, height: rect.height - (splitY - rect.y) };
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
    var areaIndex = areaIndices[0];
    for (var y = rect.y; y < rect.y + rect.height; y++) {
        for (var x = rect.x; x < rect.x + rect.width; x++) {
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
function canSatisfyConstraints(rect, areaIndices, params) {
    if (rect.width <= 0 || rect.height <= 0) {
        return false;
    }
    // Check mapAreaPos constraint: all required positions for the given areas must be within the rect
    for (var _i = 0, areaIndices_1 = areaIndices; _i < areaIndices_1.length; _i++) {
        var areaIndex = areaIndices_1[_i];
        var required_positions = params.mapAreaPos[areaIndex];
        if (required_positions) {
            for (var _a = 0, required_positions_1 = required_positions; _a < required_positions_1.length; _a++) {
                var pos = required_positions_1[_a];
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
    for (var _b = 0, areaIndices_2 = areaIndices; _b < areaIndices_2.length; _b++) {
        var areaIndex = areaIndices_2[_b];
        var minSize = params.minAreaSize[areaIndex];
        if (minSize) {
            if (rect.width < minSize[0] || rect.height < minSize[1]) {
                // This check is too simple. It assumes the area gets the whole rect.
                // A better approach is needed for multiple areas.
            }
        }
    }
    // A simple heuristic: check if the total minimum area is smaller than the rect area.
    var totalMinArea = 0;
    for (var _c = 0, areaIndices_3 = areaIndices; _c < areaIndices_3.length; _c++) {
        var areaIndex = areaIndices_3[_c];
        var minSize = params.minAreaSize[areaIndex];
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
function generateMapLayout(params) {
    // 1. Initialize layout and area grids
    var layout = Array(params.Height).fill(0).map(function () { return Array(params.Width).fill(TILE_FLOOR); });
    var areaGrid = Array(params.Height).fill(0).map(function () { return Array(params.Width).fill(-1); });
    // 2. Perform partitioning
    var initialRect = { x: 1, y: 1, width: params.Width - 2, height: params.Height - 2 };
    var allAreaIndices = Array.from({ length: params.AreaNum }, function (_, i) { return i; });
    recursivePartition(areaGrid, initialRect, allAreaIndices, params);
    // 3. Place walls based on area boundaries
    for (var y = 0; y < params.Height - 1; y++) {
        for (var x = 0; x < params.Width - 1; x++) {
            var currentArea = areaGrid[y][x];
            var rightArea = areaGrid[y][x + 1];
            var downArea = areaGrid[y + 1][x];
            if (currentArea !== -1 && rightArea !== -1 && currentArea !== rightArea) {
                layout[y][x + 1] = TILE_WALL;
            }
            if (currentArea !== -1 && downArea !== -1 && currentArea !== downArea) {
                layout[y + 1][x] = TILE_WALL;
            }
        }
    }
    // 4. Create doors based on LinkData
    params.LinkData.forEach(function (_a) {
        var areaA = _a[0], areaB = _a[1];
        var possibleDoors = [];
        for (var y = 1; y < params.Height - 2; y++) {
            for (var x = 1; x < params.Width - 2; x++) {
                // Check for vertical walls between A and B
                if ((areaGrid[y][x] === areaA && areaGrid[y][x + 1] === areaB) || (areaGrid[y][x] === areaB && areaGrid[y][x + 1] === areaA)) {
                    if (layout[y][x + 1] === TILE_WALL)
                        possibleDoors.push([x + 1, y]);
                }
                // Check for horizontal walls between A and B
                if ((areaGrid[y][x] === areaA && areaGrid[y + 1][x] === areaB) || (areaGrid[y][x] === areaB && areaGrid[y + 1][x] === areaA)) {
                    if (layout[y + 1][x] === TILE_WALL)
                        possibleDoors.push([x, y + 1]);
                }
            }
        }
        if (possibleDoors.length > 0) {
            var _b = possibleDoors[Math.floor(Math.random() * possibleDoors.length)], doorX = _b[0], doorY = _b[1];
            layout[doorY][doorX] = TILE_FLOOR;
        }
    });
    // 5. Add border walls
    for (var y = 0; y < params.Height; y++) {
        for (var x = 0; x < params.Width; x++) {
            if (x === 0 || x === params.Width - 1 || y === 0 || y === params.Height - 1) {
                layout[y][x] = TILE_WALL;
            }
        }
    }
    return layout;
}
/**
 * Main function to run the map generator.
 */
function main() {
    // Example parameters (hardcoded for now)
    var exampleParams = {
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
    var layout = generateMapLayout(exampleParams);
    var output = {
        tileAssets: {
            '0': 'map_floor',
            '1': 'map_wall',
        },
        layout: layout,
    };
    var outputPath = path.join('mapdata', exampleParams.outputFilename);
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log("Map successfully generated and saved to ".concat(outputPath));
}
// Check if running as a script
if (require.main === module) {
    main();
}
