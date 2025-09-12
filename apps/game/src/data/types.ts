// DEPRECATED: types moved to @proj-tower/logic-core
// Please import types from '@proj-tower/logic-core' directly.
export * from '@proj-tower/logic-core';
// Temporary compatibility re-export: use shared JSON/raw-data types from logic-core
export * from '@proj-tower/logic-core';
import {
    EquipmentSlot,
    WeaponType,
    BuffTrigger,
    IDoor,
    IEquipment,
    IStair,
} from '@proj-tower/logic-core';

/**
 * Represents the raw data for a monster, loaded from a JSON file.
 * This is the template from which monster instances are created.
 */
export interface MonsterData {
    id: string;
    name: string;
    level: number;
    hp: number;
    maxhp: number;
    attack: number;
    defense: number;
    speed: number;
    gold: number;
    assetId?: string;
}

/**
 * Represents the raw data for an item, loaded from a JSON file.
 */
export interface ItemData {
    id: string;
    name: string;
    description: string;
    assetId?: string;
    // Optional type to classify the item. If not present in raw JSON, the DataManager will derive it.
    type?: 'key' | 'potion' | 'special';
}

/**
 * Represents the raw data for a piece of equipment, loaded from a JSON file.
 */
export interface EquipmentData {
    id: string;
    name: string;
    slot: EquipmentSlot | EquipmentSlot[];
    weaponType?: WeaponType;
    stat_mods?: {
        hp?: number;
        attack?: number;
        defense?: number;
        speed?: number;
    };
    percent_mods?: {
        hp?: number;
        attack?: number;
        defense?: number;
        speed?: number;
    };
    assetId?: string;
}

/**
 * Represents the raw data for a buff, loaded from a JSON file.
 */
export interface BuffData {
    id: string;
    name: string;
    duration: number;
    charges: number;
    triggers: BuffTrigger[];
    assetId?: string;
}

/**
 * Represents the structure of a map layout file.
 */
export interface MapLayout {
    floor: number;
    layout: (number | string)[][];
    tileAssets?: Record<string, string>;
    entities?: {
        [id: string]: {
            type: 'monster' | 'item' | 'equipment' | 'door' | 'player_start' | 'stair';
            id: string;
            x: number;
            y: number;
        };
    };
    equipments?: Record<string, IEquipment>;
    doors?: Record<string, IDoor>;
    stairs?: Record<string, IStair>;
}

/**
 * Represents the raw data for the player, loaded from a JSON file.
 */
export interface PlayerData {
    id: string;
    name: string;
    level: number;
    exp: number;
    hp?: number;
    keys: {
        yellow: number;
        blue: number;
        red: number;
    };
}
