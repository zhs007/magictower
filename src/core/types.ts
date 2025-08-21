// Base interface for all objects in the game that have an ID and a name.
export interface IBaseObject {
    id: string;
    name: string;
}

// Defines the slots where equipment can be placed.
export enum EquipmentSlot {
    HEAD = 'head',
    BODY = 'body',
    LEFT_HAND = 'left_hand', // Can hold a shield or a one-handed weapon
    RIGHT_HAND = 'right_hand', // Can hold a one-handed weapon
    FEET = 'feet',
}

// For weapons, to distinguish between one-handed and two-handed.
export enum WeaponType {
    ONE_HANDED = 'one_handed',
    TWO_HANDED = 'two_handed'
}

// Represents a piece of equipment.
export interface IEquipment extends IBaseObject {
    slot: EquipmentSlot | EquipmentSlot[]; // A single slot, or multiple for things like two-handed weapons
    weaponType?: WeaponType;
    attackBonus?: number;
    defenseBonus?: number;
}

// Defines when a buff can be triggered.
export enum BuffTrigger {
    ON_BATTLE_START = 'on_battle_start',
    ON_HP_LESS_THAN_ZERO = 'on_hp_less_than_zero',
    // Add other triggers as needed
}

// Represents a buff or debuff on a character.
export interface IBuff extends IBaseObject {
    duration: number; // in turns, -1 for permanent until removed
    charges: number; // number of times it can trigger, -1 for infinite
    triggers: BuffTrigger[];
    // Effects will be handled by game logic based on buff id
}

// Base interface for characters (Player, Monsters, NPCs).
// It includes properties common to all characters.
export interface ICharacter extends IBaseObject {
    hp: number;
    attack: number;
    defense: number;
    x: number;
    y: number;
    equipment: {
        [EquipmentSlot.HEAD]?: IEquipment;
        [EquipmentSlot.BODY]?: IEquipment;
        [EquipmentSlot.LEFT_HAND]?: IEquipment;
        [EquipmentSlot.RIGHT_HAND]?: IEquipment;
        [EquipmentSlot.FEET]?: IEquipment;
    };
    // Backup equipment. Not directly used in combat calculations.
    backupEquipment: (IEquipment | undefined)[];
    buffs: IBuff[];
}

export interface IPlayer extends ICharacter {
    // Player-specific properties can be added here.
}

export interface IMonster extends ICharacter {
    // Monster-specific properties can be added here.
}

export interface IItem extends IBaseObject {
    type: 'key' | 'potion';
    color?: 'yellow'; // Example for a key
    value?: number; // Example for a potion
}

export enum EntityType {
    PLAYER,
    MONSTER,
    ITEM,
    EQUIPMENT, // New entity type for equipment on the ground
    EMPTY,
    WALL,
    DOOR
}

export interface Tile {
    groundLayer: number; // e.g., floor texture id
    entityLayer?: {
        type: EntityType;
        id: string;
    };
}

export interface GameState {
    currentFloor: number;
    map: Tile[][];
    player: IPlayer;
    monsters: Record<string, IMonster>;
    items: Record<string, IItem>;
    // To store equipment that might be found on the map
    equipments: Record<string, IEquipment>;
    doors: Record<string, { id: string; color: string; }>;
}

export type Action =
    | { type: 'MOVE'; payload: { dx: number; dy: number } }
    | { type: 'PICK_UP_ITEM'; payload: { itemId: string } }
    | { type: 'OPEN_DOOR'; payload: { doorId: string } };
