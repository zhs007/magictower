export interface IPlayer {
    id: string;
    name: string;
    hp: number;
    attack: number;
    defense: number;
    x: number;
    y: number;
}

export interface IMonster {
    id: string;
    name: string;
    hp: number;
    attack: number;
    defense: number;
}

export interface IItem {
    id: string;
    name: string;
    type: 'key' | 'potion';
    color?: 'yellow'; // Example for a key
    value?: number; // Example for a potion
}

export enum EntityType {
    PLAYER,
    MONSTER,
    ITEM,
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
    doors: Record<string, { id: string; color: string; }>;
}

export type Action =
    | { type: 'MOVE'; payload: { dx: number; dy: number } }
    | { type: 'PICK_UP_ITEM'; payload: { itemId: string } }
    | { type: 'OPEN_DOOR'; payload: { doorId: string } };
