import { GameState, Action, IPlayer, IMonster, IItem } from './types';
import {
    handleMove,
    handlePickupItem,
    handleOpenDoor,
    handleStartBattle,
    handleAttack,
    handleEndBattle,
    handlePickupEquipment,
} from './logic';
import { dataManager } from '../data/data-manager';

export class GameStateManager {
    private currentState: GameState;
    public actionHistory: Action[] = [];
    public initialStateSeed: any;

    constructor() {
        this.currentState = {} as GameState;
    }

    public async createAndInitializeState(floor: number): Promise<void> {
        this.initialStateSeed = { floor };
        const initialState = await GameStateManager.createInitialState(this.initialStateSeed);
        this.initializeState(initialState);
    }

    public static async createInitialState(seed: { floor: number }): Promise<GameState> {
        await dataManager.loadAllData();
        const { floor } = seed;
        const mapData = dataManager.getMapLayout(floor);
        if (!mapData) {
            throw new Error(`Map for floor ${floor} not found.`);
        }

        const map = mapData.layout.map((row) => row.map(Number));
        const entities: Record<string, any> = {};
        const monsters: Record<string, IMonster> = {};
        const items: Record<string, IItem> = {};
        let player: IPlayer | null = null;
        let playerKey: string | null = null;

        const playerData = dataManager.getPlayerData();
        const levelData = dataManager.getLevelData();
        if (!playerData || !levelData) {
            throw new Error('Player or level data not found.');
        }

        const initialLevel = playerData.level;
        const playerLevelStats = levelData.find((l) => l.level === initialLevel);

        if (!playerLevelStats) {
            throw new Error(`Stats for initial level ${initialLevel} not found in leveldata.`);
        }

        const playerTemplate: Omit<IPlayer, 'x' | 'y'> = {
            id: playerData.id,
            name: playerData.name,
            level: initialLevel,
            exp: playerData.exp,
            hp: playerLevelStats.hp,
            maxhp: playerLevelStats.hp,
            attack: playerLevelStats.attack,
            defense: playerLevelStats.defense,
            speed: playerLevelStats.speed,
            keys: playerData.keys,
            equipment: {},
            backupEquipment: [],
            buffs: [],
            direction: 'right' as 'left' | 'right',
        };

        if (mapData.entities) {
            for (const entityKey of Object.keys(mapData.entities)) {
                const entityInfo = mapData.entities[entityKey];

                if (entityInfo.type === 'player_start') {
                    player = { ...playerTemplate, ...entityInfo };
                    playerKey = entityKey;
                } else if (entityInfo.type === 'monster') {
                    const monsterData = dataManager.getMonsterData(entityInfo.id);
                    if (monsterData) {
                        const monster = {
                            ...monsterData,
                            ...entityInfo,
                            equipment: {},
                            backupEquipment: [],
                            buffs: [],
                            direction: 'right' as 'left' | 'right',
                        };
                        monsters[entityKey] = monster;
                        entities[entityKey] = monster;
                    }
                } else if (entityInfo.type === 'item') {
                    const itemData = dataManager.getItemData(entityInfo.id);
                    if (itemData) {
                        // Use type provided by dataManager; fallback to 'special' if missing.
                        const item: IItem = Object.assign({}, itemData, {
                            type: itemData.type ?? 'special',
                            x: entityInfo.x,
                            y: entityInfo.y,
                        });
                        items[entityKey] = item;
                        entities[entityKey] = item;
                    }
                } else {
                    entities[entityKey] = { ...entityInfo };
                }
            }
        }

        if (!player || !playerKey) {
            throw new Error('Player start position not found in map data.');
        }

        // Ensure the player entity in the entities map is the full player object
        entities[playerKey] = player;

        return {
            currentFloor: floor,
            map,
            tileAssets: mapData.tileAssets,
            player,
            entities,
            monsters,
            items,
            equipments: {},
            doors: {},
            interactionState: { type: 'none' },
        };
    }

    public initializeState(initialState: GameState): void {
        this.currentState = initialState;
        this.actionHistory = [];
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
            case 'PICK_UP_EQUIPMENT':
                newState = handlePickupEquipment(this.currentState, action.payload.equipmentId);
                break;
            case 'OPEN_DOOR':
                newState = handleOpenDoor(this.currentState, action.payload.doorId);
                break;
            case 'START_BATTLE':
                newState = handleStartBattle(this.currentState, action.payload.monsterId);
                break;
            case 'ATTACK':
                newState = handleAttack(
                    this.currentState,
                    action.payload.attackerId,
                    action.payload.defenderId
                );
                break;
            case 'END_BATTLE':
                newState = handleEndBattle(
                    this.currentState,
                    action.payload.winnerId,
                    action.payload.reason
                );
                break;
            default:
                newState = this.currentState;
        }
        this.currentState = newState;
        this.actionHistory.push(action);
    }
}
