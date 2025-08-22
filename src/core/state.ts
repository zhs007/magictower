import { GameState, Action, IPlayer, IMonster, IItem } from './types';
import { handleMove, handlePickupItem, handleOpenDoor } from './logic';
import { dataManager } from '../data/data-manager';

export class GameStateManager {
    private currentState: GameState;

    constructor(initialState: GameState) {
        this.currentState = initialState;
    }

    public static async createInitialState(floor: number): Promise<GameState> {
        await dataManager.loadAllData();
        const mapData = dataManager.getMapLayout(floor);
        if (!mapData) {
            throw new Error(`Map for floor ${floor} not found.`);
        }

        const map = mapData.layout.map(row => row.map(Number));
        const entities: Record<string, any> = {};
        const monsters: Record<string, IMonster> = {};
        const items: Record<string, IItem> = {};
        let player: IPlayer | null = null;

        const playerTemplate = { id: 'player', name: 'Hero', hp: 100, attack: 10, defense: 5, equipment: {}, backupEquipment: [], buffs: [], keys: { yellow: 0, blue: 0, red: 0 } };

        if (mapData.entities) {
            for (const entityKey of Object.keys(mapData.entities)) {
                const entityInfo = mapData.entities[entityKey];
                entities[entityKey] = { ...entityInfo };

                if (entityInfo.type === 'player_start') {
                    player = { ...playerTemplate, ...entityInfo };
                } else if (entityInfo.type === 'monster') {
                    const monsterData = dataManager.getMonsterData(entityInfo.id);
                    if (monsterData) {
                        monsters[entityKey] = { ...monsterData, x: entityInfo.x, y: entityInfo.y, equipment: {}, backupEquipment: [], buffs: [] };
                        entities[entityKey] = { ...monsters[entityKey], ...entityInfo };
                    }
                } else if (entityInfo.type === 'item') {
                    const itemData = dataManager.getItemData(entityInfo.id);
                    if (itemData) {
                        items[entityKey] = { ...itemData, type: 'key', x: entityInfo.x, y: entityInfo.y };
                        entities[entityKey] = { ...items[entityKey], ...entityInfo };
                    }
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
            entities,
            monsters,
            items,
            equipments: {},
            doors: {},
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
