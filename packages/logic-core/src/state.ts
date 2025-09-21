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
import { dataManager as defaultDataManager } from './data-manager';
import { normalizeMapLayout } from './map-utils';

export class GameStateManager {
    private currentState: GameState;
    public actionHistory: Action[] = [];
    public initialStateSeed: any;

    // Accept a dataManager via constructor for explicit DI (defaults to package dataManager)
    private dataManager: any;

    constructor(dataManager?: any) {
        this.currentState = {} as GameState;
        this.dataManager = dataManager ?? defaultDataManager;
    }

    public async createAndInitializeState(floor: number): Promise<void> {
        this.initialStateSeed = { floor };
        const initialState = await this.createInitialState(this.initialStateSeed);
        this.initializeState(initialState);
    }

    // Instance-level createInitialState uses the injected dataManager. An optional
    // override can be provided for tests.
    public async createInitialState(
        seed: { floor: number },
        playerToPreserve?: IPlayer,
        dataManagerOverride?: any
    ): Promise<GameState> {
        console.log(`createInitialState called for floor ${seed.floor}.`);
        try {
            const dm = dataManagerOverride ?? this.dataManager ?? defaultDataManager;
            await dm.loadAllData();
            const { floor } = seed;
            const mapData = dm.getMapLayout(floor);
            if (!mapData) {
                throw new Error(`Map for floor ${floor} not found.`);
            }

            const mapLayout = normalizeMapLayout(mapData, { floor });
            const tileAssets = mapLayout.tileAssets;
            const entities: Record<string, any> = {};
            const monsters: Record<string, IMonster> = {};
            const items: Record<string, IItem> = {};
            const equipments: Record<string, IEquipment> = {};
            let player: IPlayer | null = null;
            let playerKey: string | null = null;

            const playerTemplate = playerToPreserve;

            const mapEntities = mapLayout.entities ?? {};

            for (const entityKey of Object.keys(mapEntities)) {
                const entityInfo = mapEntities[entityKey];

                if (entityInfo.type === 'player_start') {
                    if (playerTemplate) {
                        player = { ...playerTemplate, ...entityInfo };
                    } else {
                        const rawPlayerData = dm.getPlayerData();
                        const playerData =
                            rawPlayerData ??
                            ({
                                id: 'player',
                                name: 'Player',
                                level: 1,
                                exp: 0,
                                hp: 10,
                                keys: { yellow: 0, blue: 0, red: 0 },
                            } as any);
                        const allLevelData = dm.getLevelData();
                        let levelData = allLevelData.find(
                            (ld: LevelData) => ld.level === playerData.level
                        );
                        // Fallback: if the exact level entry isn't found, use the first
                        // entry or a minimal default to keep initialization robust in
                        // tests that stub loadAllData.
                        if (!levelData) {
                            levelData =
                                allLevelData[0] ||
                                ({
                                    level: playerData.level,
                                    exp_needed: 0,
                                    maxhp: playerData.hp ?? 10,
                                    attack: playerData.attack ?? 1,
                                    defense: playerData.defense ?? 0,
                                    speed: playerData.speed ?? 1,
                                } as LevelData);
                        }
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
                    const monsterData = dm.getMonsterData(entityInfo.id);
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
                    const itemData = dm.getItemData(entityInfo.id);
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
                    const equipmentData = dm.getEquipmentData(entityInfo.id);
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
                map: mapLayout,
                tileAssets,
                player,
                entities,
                monsters,
                items,
                equipments,
                doors: mapLayout.doors || {},
                stairs: mapLayout.stairs || {},
                interactionState: { type: 'none' },
            };
        } catch (error) {
            console.error('Error in createInitialState:', error);
            throw error;
        }
    }

    // Backwards-compatible static wrapper: some callers/tests call the static
    // GameStateManager.createInitialState - provide that API by delegating to an
    // instance. If a dataManagerOverride is supplied it will be passed to the
    // instance constructor so the instance uses the override by default.
    public static async createInitialState(
        seed: { floor: number },
        playerToPreserve?: IPlayer,
        dataManagerOverride?: any
    ): Promise<GameState> {
        const manager = new GameStateManager(dataManagerOverride);
        return manager.createInitialState(seed, playerToPreserve, dataManagerOverride);
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
                    const levelData = this.dataManager.getLevelData();
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
                    const potionData = this.dataManager.getItemData('small_potion');
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
