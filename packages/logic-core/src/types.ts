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
    TWO_HANDED = 'two_handed',
}

// Represents a piece of equipment.
export interface IEquipment extends IBaseObject {
    slot: EquipmentSlot | EquipmentSlot[]; // A single slot, or multiple for things like two-handed weapons
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
    level: number;
    hp: number;
    maxhp: number;
    attack: number;
    defense: number;
    speed: number;
    x: number;
    y: number;
    direction: 'left' | 'right';
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
    exp: number;
    // Make specific key counts optional so callers can provide partial key sets
    keys: {
        yellow?: number;
        blue?: number;
        red?: number;
    };
    hasMonsterManual?: boolean;
    specialItems?: string[];
}

export interface IMonster extends ICharacter {
    // Monster-specific properties can be added here.
}

export type SpecialItemType = 'bomb' | 'monster_manual' | 'snowflake' | 'cross';

export interface IItem extends IBaseObject {
    type: 'key' | 'potion' | 'special';
    color?: 'yellow'; // Example for a key
    value?: number; // Example for a potion
    specialType?: SpecialItemType;
}

export enum EntityType {
    PLAYER,
    MONSTER,
    ITEM,
    EQUIPMENT, // New entity type for equipment on the ground
    EMPTY,
    WALL,
    DOOR,
}

export type IEntity = (IPlayer | IMonster | IItem | IEquipment) & { type: string };

export type InteractionState =
    | { type: 'none' }
    | { type: 'item_pickup'; itemId: string }
    | { type: 'floor_change'; stairId: string }
    | {
          type: 'battle';
          monsterId: string;
          turn: 'player' | 'monster' | 'battle_end';
          playerHp: number;
          monsterHp: number;
          round: number;
      };

export interface IDoor {
    id: string;
    color: string;
    condition?: { type: 'DEFEAT_MONSTER'; monsterId: string };
}

export interface IStair {
    id: string;
    target: {
        floor: number;
        x: number;
        y: number;
    };
}

export interface ITileAsset {
    assetId: string;
    isEntity: boolean;
}

export interface GameState {
    currentFloor: number;
    // Map is the structured MapLayout object
    map: MapLayout;
    tileAssets?: Record<string, ITileAsset>;
    player: IPlayer;
    entities: Record<string, any>; // A dictionary of all entities on the map
    monsters: Record<string, IMonster>;
    items: Record<string, IItem>;
    equipments: Record<string, IEquipment>;
    doors: Record<string, IDoor>;
    stairs: Record<string, IStair>;
    interactionState: InteractionState;
}

export type Action =
    | { type: 'MOVE'; payload: { dx: number; dy: number } }
    | { type: 'CHANGE_FLOOR'; payload: { stairId: string } }
    | { type: 'PICK_UP_ITEM'; payload: { itemId: string } }
    | { type: 'PICK_UP_EQUIPMENT'; payload: { equipmentId: string } }
    | { type: 'OPEN_DOOR'; payload: { doorId: string } }
    | { type: 'START_BATTLE'; payload: { monsterId: string } }
    | { type: 'ATTACK'; payload: { attackerId: string; defenderId: string } }
    | {
          type: 'END_BATTLE';
          payload: { winnerId: string | null; reason: 'hp_depleted' | 'timeout' };
      }
    | { type: 'USE_BOMB'; payload: { monsterType: string } }
    | { type: 'USE_POTION' };

export interface SaveData {
    timestamp: number;
    initialStateSeed: any; // Used to generate the initial game state
    actions: Action[]; // All actions from game start to the save point
    screenshot?: string; // Optional screenshot for the save list display
}

/**
 * Represents the structure of a single level entry in the level-up table.
 */
export interface LevelData {
    level: number;
    exp_needed: number;
    maxhp: number;
    attack: number;
    defense: number;
    speed: number;
}

// Raw JSON data shapes (used for files under gamedata/ and mapdata/).
// These represent the structure of the JSON files on disk and are useful
// for typing import.meta.glob results and test fixtures.
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

export interface ItemData {
    id: string;
    name: string;
    description: string;
    assetId?: string;
    type?: 'key' | 'potion' | 'special';
}

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

export interface BuffData {
    id: string;
    name: string;
    duration: number;
    charges: number;
    triggers: BuffTrigger[];
    assetId?: string;
}

export interface MapLayout {
    floor: number;
    // Primary 2D layout grid. layout[y][x] gives a cell value.
    layout: (number | string)[][];
    tileAssets?: Record<string, ITileAsset>;
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
