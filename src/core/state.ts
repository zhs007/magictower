import { GameState, Action, Tile, IPlayer, IMonster, IItem, EntityType } from './types';
import { handleMove, handlePickupItem, handleOpenDoor } from './logic';
import { dataManager } from '../data/data-manager';

export class GameStateManager {
    private currentState: GameState;

    constructor(initialState: GameState) {
        this.currentState = initialState;
    }

    public static async createInitialState(floor: number): Promise<GameState> {
        // Ensure data is loaded before creating the state
        await dataManager.loadAllData();

        const mapLayout = dataManager.getMapLayout(floor);
        if (!mapLayout) {
            throw new Error(`Map for floor ${floor} not found.`);
        }

        const playerTemplate = { id: 'player', name: 'Hero', hp: 100, attack: 10, defense: 5, equipment: {}, backupEquipment: [], buffs: [] };
        let player: IPlayer | null = null;

        const monsters: Record<string, IMonster> = {};
        const items: Record<string, IItem> = {};

        // Create the map tiles
        const map: Tile[][] = mapLayout.layout.map(row =>
            row.map(cell => ({ groundLayer: Number(cell) }))
        );

        // Populate entities from the map data
        if (mapLayout.entities) {
            for (const entityKey in mapLayout.entities) {
                const entityInfo = mapLayout.entities[entityKey];
                const { x, y, id, type } = entityInfo;

                switch (type) {
                    case 'player_start':
                        player = { ...playerTemplate, x, y };
                        map[y][x].entityLayer = { type: EntityType.PLAYER, id: 'player' };
                        break;
                    case 'monster':
                        const monsterData = dataManager.getMonsterData(id);
                        if (monsterData) {
                            monsters[entityKey] = { ...monsterData, x, y, equipment: {}, backupEquipment: [], buffs: [] };
                            map[y][x].entityLayer = { type: EntityType.MONSTER, id: entityKey };
                        }
                        break;
                    case 'item':
                        const itemData = dataManager.getItemData(id);
                        if (itemData) {
                            items[entityKey] = { ...itemData, type: 'key', x, y }; // Assuming a type for now
                            map[y][x].entityLayer = { type: EntityType.ITEM, id: entityKey };
                        }
                        break;
                }
            }
        }

        if (!player) {
            throw new Error("Player start position not found in map data.");
        }

        return {
            currentFloor: floor,
            map,
            player,
            monsters,
            items,
            equipments: {}, // Assuming no equipment on the ground initially
            doors: {}, // Assuming no doors initially
        };
    }

    public initializeState(initialState: GameState): void {
        this.currentState = initialState;
    }

    public getState(): GameState {
        return this.currentState;
    }

    public dispatch(action: Action): void {
        let newState: GameState;
        switch (action.type) {
            case 'MOVE':
                newState = handleMove(this.currentState, action.payload.dx, action.payload.dy);
                break;
            case 'PICK_UP_ITEM':
                newState = handlePickupItem(this.currentState, action.payload.itemId);
                break;
            case 'OPEN_DOOR':
                newState = handleOpenDoor(this.currentState, action.payload.doorId);
                break;
            default:
                newState = this.currentState;
        }
        this.currentState = newState;
    }
}
