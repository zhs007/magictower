import { EquipmentSlot, WeaponType, BuffTrigger } from '../core/types';

/**
 * Represents the raw data for a monster, loaded from a JSON file.
 * This is the template from which monster instances are created.
 */
export interface MonsterData {
    id: string;
    name: string;
    hp: number;
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
    entities?: {
        [id: string]: {
            type: 'monster' | 'item' | 'equipment' | 'door' | 'player_start';
            id: string;
            x: number;
            y: number;
        };
    };
}
