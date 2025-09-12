import { GameState, Action, IPlayer, IMonster, IItem, IEquipment } from './types';
import { LevelData } from './types';
import {
    handleMove,
    handlePickupItem,
    handleOpenDoor,
    handleStartBattle,
    handleAttack,
    handleEndBattle,
    handlePickupEquipment,
    handleUsePotion,
} from './logic';
// Import dataManager from package entry so tests that mock the package
// (vi.mock('@proj-tower/logic-core')) will override it.
let dataManager: any; // Cached reference to the package-exported dataManager. Filled when createInitialState runs.

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
        playerToPreserve?: IPlayer,
        dataManagerOverride?: any
    ): Promise<GameState> {
        console.log(`createInitialState called for floor ${seed.floor}.`);
        try {
            if (dataManagerOverride) {
                dataManager = dataManagerOverride;
            } else {
                // Import the package entry at runtime so tests that mock the package
                // (vi.mock('@proj-tower/logic-core')) will be able to override exports.
                // Use @ts-ignore to avoid TypeScript attempting to resolve the package
                // during the library build.
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const pkg = await import('@proj-tower/logic-core');
                dataManager = pkg.dataManager;
            }
            await dataManager.loadAllData();
            const { floor } = seed;
            const mapData = dataManager.getMapLayout(floor);
            if (!mapData) {
                throw new Error(`Map for floor ${floor} not found.`);
            }

            const map = mapData.layout.map((row: (number | string)[]) => row.map(Number));
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
                        if (playerTemplate) {
                            player = { ...playerTemplate, ...entityInfo };
                        } else {
                            const playerData = dataManager.getPlayerData()!;
                            const levelData = dataManager
                                .getLevelData()
                                .find((ld: LevelData) => ld.level === playerData.level)!;
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
                player = playerToPreserve;
            }

            if (!player) {
                throw new Error('Player could not be created or placed.');
            }

            if (playerKey) {
                entities[playerKey] = player;
            } else {
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
                    const potionItem = potionData
                        ? ({
                              ...potionData,
                              type: potionData.type ?? 'special',
                          } as unknown as any)
                        : undefined;
                    newState = handleUsePotion(this.currentState, potionItem);
                }
                break;
            default:
                newState = this.currentState;
        }
        this.currentState = newState;
        this.actionHistory.push(action);
    }
}

