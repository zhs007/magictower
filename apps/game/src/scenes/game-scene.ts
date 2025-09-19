import { GameState, calculateDamage, dataManager, GameStateManager } from '@proj-tower/logic-core';
import { SaveManager } from '@proj-tower/logic-core';
import { CharacterEntity } from '@proj-tower/maprender';
import { Renderer } from '../renderer/renderer';
import { InputManager } from '../core/input-manager';
import { BaseScene } from './base-scene';
import { SceneManager } from './scene-manager';

interface GameSceneOptions {
    newGame?: boolean;
    loadSlot?: string;
}

export class GameScene extends BaseScene {
    private gameStateManager: GameStateManager | null = null;
    private renderer: Renderer;
    private inputManager: InputManager;
    private isAnimating: boolean = false;
    private playerEntityKey: string | undefined;

    // Accept an optional GameStateManager to support dependency injection
    constructor(sceneManager: SceneManager, gameStateManager?: GameStateManager) {
        super(sceneManager);
        this.renderer = new Renderer(this);
        this.inputManager = new InputManager();
        this.gameStateManager = gameStateManager ?? null;
    }

    public async onEnter(options: GameSceneOptions): Promise<void> {
        await this.initializeGame(options);
    }

    public onExit(): void {
        this.inputManager.destroy();
        this.removeChildren();
    }

    private async initializeGame(options: GameSceneOptions): Promise<void> {
        await dataManager.loadAllData();
        await this.renderer.loadAssets();

        // Ensure we have a GameStateManager instance (use injected one when available)
        if (!this.gameStateManager) {
            this.gameStateManager = new GameStateManager();
        }

        let initialState;
        if (options.loadSlot) {
            const loadedState = await SaveManager.loadGame(options.loadSlot);
            initialState =
                loadedState || (await this.gameStateManager.createInitialState({ floor: 1 }));
        } else {
            initialState = await this.gameStateManager.createInitialState({ floor: 1 });
        }

        this.gameStateManager.initializeState(initialState);
        this.playerEntityKey = Object.keys(initialState.entities).find(
            (k) => initialState.entities[k].type === 'player_start'
        );
        this.renderer.initialize(this.gameStateManager.getState());

        this.inputManager.on('action', (action) => this.handleAction(action));
    }

    private handleAction(action: any): void {
        if (this.isAnimating || !this.gameStateManager) {
            console.debug('handleAction: ignored action because isAnimating or missing gsm', {
                action,
                isAnimating: this.isAnimating,
                hasGSM: !!this.gameStateManager,
            });
            return;
        }

        this.gameStateManager.dispatch(action);
        const newState = this.gameStateManager.getState();
        this.processInteraction(newState);
    }

    private processInteraction(state: GameState): void {
        if (this.isAnimating) {
            return;
        }

        console.log('Processing interaction:', state.interactionState.type);
        switch (state.interactionState.type) {
            case 'item_pickup':
                this.handleItemPickup(state);
                break;
            case 'floor_change':
                this.handleFloorChange(state);
                break;
            case 'battle':
                this.handleBattle(state);
                break;
            default:
                this.renderer.render(state);
        }
    }

    private async handleFloorChange(state: GameState): Promise<void> {
        if (!this.gameStateManager || state.interactionState.type !== 'floor_change') {
            return;
        }
        console.log('Handling floor change...');
        this.isAnimating = true;

        const stairId = state.interactionState.stairId;
        const stair = state.stairs[stairId];
        if (!stair) {
            console.error('Stair data not found for ID:', stairId);
            this.isAnimating = false;
            return;
        }

        this.renderer.animateFloorTransition(() => {
            (async () => {
                if (!this.gameStateManager) return;
                console.log('Floor transition animation callback started.');

                const target = stair.target;
                const currentPlayerState = this.gameStateManager.getState().player;

                // Preserve player state, but update coordinates
                const playerForNextFloor = {
                    ...currentPlayerState,
                    x: target.x,
                    y: target.y,
                };

                console.log(`Creating new state for floor ${target.floor}`);
                const newState = await new GameStateManager().createInitialState(
                    { floor: target.floor },
                    playerForNextFloor
                );
                console.log('New game state created.');

                // The player object in the new state needs to be the one we preserved and updated
                newState.player = playerForNextFloor;

                this.gameStateManager.initializeState(newState);
                this.playerEntityKey = Object.keys(newState.entities).find(
                    (k) =>
                        newState.entities[k].type === 'player_start' ||
                        newState.entities[k].id === 'player'
                );
                this.renderer.initialize(newState);
                console.log('GameStateManager and Renderer re-initialized.');
                this.isAnimating = false;
            })();
        });
    }

    private handleItemPickup(state: GameState): void {
        if (!this.playerEntityKey || state.interactionState.type !== 'item_pickup') return;
        this.isAnimating = true;

        const playerEntity = this.renderer.getEntity(this.playerEntityKey) as CharacterEntity;
        const itemEntity = this.renderer.getEntity(state.interactionState.itemId);

        if (!playerEntity || !itemEntity) {
            console.debug(
                'handleItemPickup: missing renderer entity (fallback will pick up item)',
                {
                    playerEntityKey: this.playerEntityKey,
                    itemId: state.interactionState.itemId,
                    playerEntityExists: !!playerEntity,
                    itemEntityExists: !!itemEntity,
                }
            );

            // Fallback: pick item up immediately; ensure isAnimating is
            // cleared in all cases so the input loop isn't permanently locked.
            try {
                if (this.gameStateManager && state.items?.[state.interactionState.itemId]) {
                    const itemId = state.interactionState.itemId;
                    this.gameStateManager.dispatch({
                        type: 'PICK_UP_ITEM',
                        payload: { itemId },
                    });
                    this.renderer.render(this.gameStateManager.getState());
                    const item = state.items[itemId];
                    if (item && this.playerEntityKey) {
                        try {
                            this.renderer.showFloatingTextOnEntity(
                                `+1 ${item.name}`,
                                'ITEM_GAIN',
                                this.playerEntityKey
                            );
                        } catch (e) {
                            console.warn('showFloatingTextOnEntity failed', e);
                        }
                    }
                }
            } catch (e) {
                console.error('handleItemPickup fallback failed', e);
            } finally {
                this.isAnimating = false;
            }
            return;
        }

        playerEntity.pickup(itemEntity, () => {
            if (this.gameStateManager && state.interactionState.type === 'item_pickup') {
                const itemId = state.interactionState.itemId;
                const item = state.items[itemId];
                this.gameStateManager.dispatch({
                    type: 'PICK_UP_ITEM',
                    payload: { itemId: itemId },
                });
                this.renderer.render(this.gameStateManager.getState());
                if (item && this.playerEntityKey) {
                    this.renderer.showFloatingTextOnEntity(
                        `+1 ${item.name}`,
                        'ITEM_GAIN',
                        this.playerEntityKey
                    );
                }
            }
            this.isAnimating = false;
        });
    }

    private handleBattle(state: GameState): void {
        if (!this.gameStateManager || !this.playerEntityKey) return;
        if (state.interactionState.type !== 'battle') return;
        const battleState = state.interactionState;

        if (battleState.turn === 'battle_end') {
            if (battleState.round > 8) {
                this.gameStateManager.dispatch({
                    type: 'END_BATTLE',
                    payload: { winnerId: null, reason: 'timeout' },
                });
            } else {
                const winnerId =
                    battleState.playerHp > 0 ? this.playerEntityKey : battleState.monsterId;
                this.gameStateManager.dispatch({
                    type: 'END_BATTLE',
                    payload: { winnerId, reason: 'hp_depleted' },
                });
            }
            this.renderer.render(this.gameStateManager.getState());
            return;
        }

        this.isAnimating = true;

        const player = state.player;
        const monster = state.monsters[battleState.monsterId];
        if (!monster) {
            this.isAnimating = false;
            return;
        }

        const attackerData = battleState.turn === 'player' ? player : monster;
        const defenderData = battleState.turn === 'player' ? monster : player;
        const attackerId =
            battleState.turn === 'player' ? this.playerEntityKey : battleState.monsterId;
        const defenderId =
            battleState.turn === 'player' ? battleState.monsterId : this.playerEntityKey;

        const attackerEntity = this.renderer.getEntity(attackerId) as CharacterEntity;
        const defenderEntity = this.renderer.getEntity(defenderId) as CharacterEntity;

        if (!attackerEntity || !defenderEntity) {
            this.isAnimating = false;
            return;
        }

        const damage = calculateDamage(attackerData, defenderData);

        const showDamage = (dmg: number) => {
            this.renderer.floatingTextManager.add(`-${dmg}`, 'DAMAGE', defenderId);
        };

        attackerEntity.attack(defenderEntity, damage, showDamage, () => {
            if (this.gameStateManager) {
                this.gameStateManager.dispatch({
                    type: 'ATTACK',
                    payload: { attackerId, defenderId },
                });
                const nextState = this.gameStateManager.getState();
                this.renderer.render(nextState);
                this.isAnimating = false;

                const gsm = this.gameStateManager!;
                setTimeout(() => {
                    this.processInteraction(gsm.getState());
                }, 0);
            }
        });
    }
}
