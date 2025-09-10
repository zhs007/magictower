import {
    GameState,
    Action,
    IPlayer,
    IMonster,
    IItem,
    IEquipment,
    handleMove,
    handlePickupItem,
    handleOpenDoor,
    handleStartBattle,
    handleAttack,
    handleEndBattle,
    handlePickupEquipment,
    handleUsePotion,
} from '@proj-tower/logic-core';
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

    public static async createInitialState(
        seed: { floor: number },
        playerToPreserve?: IPlayer
    ): Promise<GameState> {
        console.log(`createInitialState called for floor ${seed.floor}.`);
        try {
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
            const equipments: Record<string, IEquipment> = {};
            let player: IPlayer | null = null;
            let playerKey: string | null = null;

            const playerTemplate = playerToPreserve;

            if (mapData.entities) {
                for (const entityKey of Object.keys(mapData.entities)) {
                    const entityInfo = mapData.entities[entityKey];

                    if (entityInfo.type === 'player_start') {
                        // This is for new games or if there's no specific stair target
                        if (playerTemplate) {
                            player = { ...playerTemplate, ...entityInfo };
                        } else {
                            // Create player from scratch if not preserved
                            const playerData = dataManager.getPlayerData()!;
                            const levelData = dataManager
                                .getLevelData()
                                .find((ld) => ld.level === playerData.level)!;
                            player = {
                                ...playerData,
                                hp: levelData.maxhp,
                                maxhp: levelData.maxhp,
                                attack: levelData.attack,
                                defense: levelData.defense,
                                speed: levelData.speed,
                                equipment: {},
                                backupEquipment: [],
                                buffs: [],
                                direction: 'right',
                                ...entityInfo,
                            };
                        }
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
                    } else if (entityInfo.type === 'equipment') {
                        const equipmentData = dataManager.getEquipmentData(entityInfo.id);
                        if (equipmentData) {
                            const equipment: IEquipment = {
                                ...equipmentData,
                                ...entityInfo,
                            };
                            equipments[entityKey] = equipment;
                            entities[entityKey] = equipment;
                        }
                    } else {
                        entities[entityKey] = { ...entityInfo };
                    }
                }
            }

            if (!player && playerToPreserve) {
                // If the map has no player_start, but we have a player (from stairs), use them
                player = playerToPreserve;
            }

            if (!player) {
                throw new Error('Player could not be created or placed.');
            }

            // The playerKey might not exist if we came from stairs to a map without a player_start
            if (playerKey) {
                entities[playerKey] = player;
            } else {
                // If there's no player_start on the map (e.g. arriving from stairs),
                // we must still add the player to the entities list for rendering.
                // We'll use a conventional key.
                entities['player'] = { ...player, type: 'player_start' };
            }

            console.log('Successfully created new game state.');
            return {
                currentFloor: floor,
                map,
                tileAssets: mapData.tileAssets,
                player,
                entities,
                monsters,
                items,
                equipments,
                doors: mapData.doors || {},
                stairs: mapData.stairs || {},
                interactionState: { type: 'none' },
            };
        } catch (error) {
            console.error('Error in createInitialState:', error);
            throw error;
        }
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
                {
                    const levelData = dataManager.getLevelData();
                    newState = handleEndBattle(
                        this.currentState,
                        action.payload.winnerId,
                        action.payload.reason,
                        levelData
                    );
                }
                break;
            case 'USE_POTION':
                {
                    const potionData = dataManager.getItemData('small_potion');
                    newState = handleUsePotion(this.currentState, potionData);
                }
                break;
            default:
                newState = this.currentState;
        }
        this.currentState = newState;
        this.actionHistory.push(action);
    }
}
