import { MapLayout, ITileAsset, IDoor, IStair, IEquipment } from './types';

export type MapLayoutLike = MapLayout | (number | string)[][] | undefined | null;

interface NormalizeContext {
    floor?: number;
    tileAssets?: Record<string, ITileAsset>;
    entities?: MapLayout['entities'];
    doors?: Record<string, IDoor>;
    stairs?: Record<string, IStair>;
    equipments?: Record<string, IEquipment>;
}

const deepClone = <T>(value: T | undefined): T | undefined => {
    if (value === undefined) return undefined;
    if (typeof (globalThis as any).structuredClone === 'function') {
        return (globalThis as any).structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value)) as T;
};

const cloneTileAssets = (tileAssets?: Record<string, ITileAsset>): Record<string, ITileAsset> | undefined => {
    if (!tileAssets) return undefined;
    const cloned: Record<string, ITileAsset> = {};
    for (const [key, value] of Object.entries(tileAssets)) {
        cloned[key] = deepClone(value)!;
    }
    return cloned;
};

const cloneLayout = (layout: (number | string)[][]): (number | string)[][] =>
    layout.map((row) => row.map((cell) => coerceCellValue(cell)));

const coerceCellValue = (cell: number | string): number | string => {
    if (typeof cell === 'number') return cell;
    const trimmed = cell.trim();
    if (trimmed === '') return cell;
    if (/^[+-]?\d+(?:\.\d+)?$/.test(trimmed)) {
        const num = Number(trimmed);
        if (!Number.isNaN(num)) {
            return num;
        }
    }
    return cell;
};

const cloneEntities = (entities?: MapLayout['entities']): MapLayout['entities'] | undefined => {
    if (!entities) return undefined;
    const cloned: NonNullable<MapLayout['entities']> = {};
    for (const [key, value] of Object.entries(entities)) {
        cloned[key] = deepClone(value)!;
    }
    return cloned;
};

const cloneRecord = <T>(record?: Record<string, T>): Record<string, T> | undefined => {
    if (!record) return undefined;
    const cloned: Record<string, T> = {};
    for (const [key, value] of Object.entries(record)) {
        cloned[key] = deepClone(value)!;
    }
    return cloned;
};

/**
 * Normalize any legacy map representation into a canonical MapLayout.
 * Accepts raw layout arrays or partial MapLayout objects and fills in
 * reasonable defaults so downstream code can rely on a consistent shape.
 */
export const normalizeMapLayout = (
    input: MapLayoutLike,
    context: NormalizeContext = {}
): MapLayout => {
    const floor = context.floor ?? 1;

    if (!input) {
        return {
            floor,
            layout: [],
            tileAssets: cloneTileAssets(context.tileAssets),
            entities: cloneEntities(context.entities),
            doors: cloneRecord(context.doors),
            stairs: cloneRecord(context.stairs),
            equipments: cloneRecord(context.equipments),
        };
    }

    if (Array.isArray(input)) {
        return {
            floor,
            layout: cloneLayout(input),
            tileAssets: cloneTileAssets(context.tileAssets),
            entities: cloneEntities(context.entities),
            doors: cloneRecord(context.doors),
            stairs: cloneRecord(context.stairs),
            equipments: cloneRecord(context.equipments),
        };
    }

    return {
        floor: input.floor ?? floor,
        layout: cloneLayout(input.layout ?? []),
        tileAssets: cloneTileAssets(input.tileAssets ?? context.tileAssets),
        entities: cloneEntities(input.entities ?? context.entities),
        doors: cloneRecord(input.doors ?? context.doors),
        stairs: cloneRecord(input.stairs ?? context.stairs),
        equipments: cloneRecord(input.equipments ?? context.equipments),
    };
};
