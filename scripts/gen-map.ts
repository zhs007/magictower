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

function isPointInRect(point: Vec2, rect: Rect): boolean {
    return point[0] >= rect.x && point[0] < rect.x + rect.width &&
           point[1] >= rect.y && point[1] < rect.y + rect.height;
}

function isConnected(areas: Set<number>, adj: Record<number, number[]>): boolean {
    if (areas.size <= 1) return true;
    const startNode = areas.values().next().value;
    const queue = [startNode];
    const visited = new Set([startNode]);
    while(queue.length > 0) {
        const u = queue.shift()!;
        for (const v of (adj[u] || [])) {
            if (areas.has(v) && !visited.has(v)) {
                visited.add(v);
                queue.push(v);
            }
        }
    }
    return visited.size === areas.size;
}

function findValidPartition(areas: number[], allLinks: [number, number][], random: () => number): [number[], number[]][] {
    const validPartitions: [number[], number[]][] = [];
    const n = areas.length;
    if (n <= 1) return [];

    const areaSet = new Set(areas);
    const adj: Record<number, number[]> = {};
    areas.forEach(area => adj[area] = []);
    allLinks.forEach(([u, v]) => {
        if (areaSet.has(u) && areaSet.has(v)) {
            adj[u].push(v);
            adj[v].push(u);
        }
    });

    for (let i = 1; i < (1 << n) / 2; i++) {
        const groupASet = new Set<number>();
        const groupBSet = new Set<number>();
        for (let j = 0; j < n; j++) {
            if ((i & (1 << j)) > 0) {
                groupASet.add(areas[j]);
            } else {
                groupBSet.add(areas[j]);
            }
        }
        if (isConnected(groupASet, adj) && isConnected(groupBSet, adj)) {
            validPartitions.push([Array.from(groupASet), Array.from(groupBSet)]);
        }
    }
    return validPartitions;
}

function canGeometricallyFit(rect: Rect, areas: number[], params: GenMapParams): boolean {
    if (rect.width <= 0 || rect.height <= 0) return false;
    // Check mapAreaPos
    for (const areaIndex of areas) {
        for (const pos of (params.mapAreaPos[areaIndex] || [])) {
            if (!isPointInRect(pos, rect)) return false;
        }
    }
    // Check minAreaSize
    let totalMinArea = 0;
    for (const areaIndex of areas) {
        const minSize = params.minAreaSize[areaIndex] || [1, 1];
        totalMinArea += minSize[0] * minSize[1];
    }
    return rect.width * rect.height >= totalMinArea;
}

function isPosRequired(x: number, y: number, params: GenMapParams): boolean {
    for (const areaIndex in params.mapAreaPos) {
        for (const pos of params.mapAreaPos[areaIndex]) {
            if (pos[0] === x && pos[1] === y) {
                return true;
            }
        }
    }
    return false;
}

function recursivePartition(areaGrid: number[][], rect: Rect, areaIndices: number[], params: GenMapParams, random: () => number) {
    if (areaIndices.length === 0) return;
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

    const allPartitions = findValidPartition(areaIndices, params.LinkData, random);
    const shuffledPartitions = allPartitions.sort(() => random() - 0.5);

    for (const [groupA, groupB] of shuffledPartitions) {
        const canSplitVertical = rect.width > 2;
        const canSplitHorizontal = rect.height > 2;
        const directions = [];
        if (canSplitVertical) directions.push('V');
        if (canSplitHorizontal) directions.push('H');

        for (const dir of directions.sort(() => random() - 0.5)) {
            const mainAxisLength = dir === 'V' ? rect.width : rect.height;
            for (let offset = 2; offset < mainAxisLength - 2; offset++) {
                let rectA: Rect, rectB: Rect;
                if (dir === 'V') {
                    const splitX = rect.x + offset;
                    rectA = { x: rect.x, y: rect.y, width: splitX - rect.x, height: rect.height };
                    rectB = { x: splitX, y: rect.y, width: rect.width - (splitX - rect.x), height: rect.height };
                } else {
                    const splitY = rect.y + offset;
                    rectA = { x: rect.x, y: rect.y, width: rect.width, height: splitY - rect.y };
                    rectB = { x: rect.x, y: splitY, width: rect.width, height: rect.height - (splitY - rect.y) };
                }

                if (canGeometricallyFit(rectA, groupA, params) && canGeometricallyFit(rectB, groupB, params)) {
                    recursivePartition(areaGrid, rectA, groupA, params, random);
                    recursivePartition(areaGrid, rectB, groupB, params, random);
                    return;
                }
                if (canGeometricallyFit(rectA, groupB, params) && canGeometricallyFit(rectB, groupA, params)) {
                     recursivePartition(areaGrid, rectA, groupB, params, random);
                     recursivePartition(areaGrid, rectB, groupA, params, random);
                     return;
                }
            }
        }
    }

    // Fallback if no valid split can be found
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

function createPRNG(seed: number): () => number {
    return function() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

interface WallSegment { start: Vec2; end: Vec2; orientation: 'V' | 'H'; }

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
                if (area1 !== -1 && area2 !== -1 && area1 !== area2) {
                    let endY = y;
                    while (endY + 1 < height -1 && layout[endY+1][x] === TILE_WALL && areaGrid[endY+1][x-1] === area1 && areaGrid[endY+1][x+1] === area2) { endY++; }
                    if (endY >= y) {
                        segments.push({ start: [x, y], end: [x, endY], orientation: 'V' });
                        for(let i = y; i <= endY; i++) visited[i][x] = true;
                    }
                }
                const area3 = areaGrid[y-1][x];
                const area4 = areaGrid[y+1][x];
                if (area3 !== -1 && area4 !== -1 && area3 !== area4) {
                    let endX = x;
                    while (endX + 1 < width -1 && layout[y][endX+1] === TILE_WALL && areaGrid[y-1][endX+1] === area3 && areaGrid[y+1][endX+1] === area4) { endX++; }
                     if (endX >= x) {
                        segments.push({ start: [x, y], end: [endX, y], orientation: 'H' });
                        for(let i = x; i <= endX; i++) visited[y][i] = true;
                    }
                }
            }
        }
    }
    return segments;
}

function generateMapLayout(params: GenMapParams): { layout: number[][], areaGrid: number[][] } {
  const random = createPRNG(params.seed);
  const layout: number[][] = Array(params.Height).fill(0).map(() => Array(params.Width).fill(TILE_FLOOR));
  const areaGrid: number[][] = Array(params.Height).fill(0).map(() => Array(params.Width).fill(-1));

  const initialRect: Rect = { x: 1, y: 1, width: params.Width - 2, height: params.Height - 2 };
  const allAreaIndices = Array.from({ length: params.AreaNum }, (_, i) => i);
  recursivePartition(areaGrid, initialRect, allAreaIndices, params, random);

  for (let y = 0; y < params.Height - 1; y++) {
    for (let x = 0; x < params.Width - 1; x++) {
        const area1 = areaGrid[y][x];
        const area2 = areaGrid[y][x+1];
        const area3 = areaGrid[y+1][x];
        if (area1 !== -1 && area2 !== -1 && area1 !== area2) {
            if (!isPosRequired(x + 1, y, params)) {
                layout[y][x+1] = TILE_WALL; areaGrid[y][x+1] = -1;
            }
        }
        if (area1 !== -1 && area3 !== -1 && area1 !== area3) {
            if (!isPosRequired(x, y + 1, params)) {
                layout[y+1][x] = TILE_WALL; areaGrid[y+1][x] = -1;
            }
        }
    }
  }

  const wallSegments = findWallSegments(layout, areaGrid);
  wallSegments.forEach(segment => {
    if (random() > 0.5) {
        const len = segment.orientation === 'V' ? segment.end[1] - segment.start[1] : segment.end[0] - segment.start[0];
        if (len < 3) return;
        const bendIndex = Math.floor(random() * (len - 2)) + 1;
        const pushDist = random() > 0.7 ? 2 : 1;
        const pushDir = random() > 0.5 ? 1 : -1;
        let segmentToMove: Vec2[], hingePoint: Vec2;
        if (segment.orientation === 'V') {
            hingePoint = [segment.start[0], segment.start[1] + bendIndex];
            segmentToMove = [];
            for (let y = hingePoint[1] + 1; y <= segment.end[1]; y++) { segmentToMove.push([segment.start[0], y]); }
        } else {
            hingePoint = [segment.start[0] + bendIndex, segment.start[1]];
            segmentToMove = [];
            for (let x = hingePoint[0] + 1; x <= segment.end[0]; x++) { segmentToMove.push([x, segment.start[1]]); }
        }
        const isValid = segmentToMove.every(([x, y]) => {
            const targetX = x + (segment.orientation === 'V' ? pushDir * pushDist : 0);
            const targetY = y + (segment.orientation === 'H' ? pushDir * pushDist : 0);
            if (targetX < 0 || targetX >= params.Width || targetY < 0 || targetY >= params.Height) return false;
            if (isPosRequired(targetX, targetY, params)) return false;
            return layout[targetY][targetX] === TILE_FLOOR;
        });
        if (isValid) {
            segmentToMove.forEach(([x, y]) => {
                layout[y][x] = TILE_FLOOR;
                if (segment.orientation === 'V') { layout[y][x + pushDir * pushDist] = TILE_WALL; areaGrid[y][x + pushDir * pushDist] = -1; }
                else { layout[y + pushDir * pushDist][x] = TILE_WALL; areaGrid[y + pushDir * pushDist][x] = -1; }
            });
            if (segment.orientation === 'V') {
                for (let i = 1; i <= pushDist; i++) {
                    const hx = hingePoint[0] + pushDir * i;
                    const hy = hingePoint[1];
                    if (!isPosRequired(hx, hy, params)) {
                        layout[hy][hx] = TILE_WALL; areaGrid[hy][hx] = -1;
                    }
                }
            } else {
                 for (let i = 1; i <= pushDist; i++) {
                    const hx = hingePoint[0];
                    const hy = hingePoint[1] + pushDir * i;
                     if (!isPosRequired(hx, hy, params)) {
                        layout[hy][hx] = TILE_WALL; areaGrid[hy][hx] = -1;
                     }
                }
            }
        }
    }
  });

  const doorLinks = new Map<string, Vec2[]>();
  params.LinkData.forEach(link => { doorLinks.set(link.sort().join(','), []); });
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
            if (doorLinks.has(key)) { doorLinks.get(key)!.push([x, y]); }
        }
    }
  }
  doorLinks.forEach(possibleDoors => {
      if (possibleDoors.length > 0) {
        const [doorX, doorY] = possibleDoors[Math.floor(random() * possibleDoors.length)];
        layout[doorY][doorX] = TILE_FLOOR;
    }
  });

  for (let y = 0; y < params.Height; y++) {
    for (let x = 0; x < params.Width; x++) {
      if (x === 0 || x === params.Width - 1 || y === 0 || y === params.Height - 1) {
        layout[y][x] = TILE_WALL;
      }
    }
  }

  return { layout, areaGrid };
}

export { generateMapLayout, TILE_FLOOR, TILE_WALL };
export type { GenMapParams, Vec2 };
