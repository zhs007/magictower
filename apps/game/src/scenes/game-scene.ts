import { GameState, calculateDamage, dataManager } from '@proj-tower/logic-core';
import { GameStateManager } from '@proj-tower/logic-core';
import { SaveManager } from '@proj-tower/logic-core';
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

    constructor(sceneManager: SceneManager) {
        super(sceneManager);
        this.renderer = new Renderer(this);
        this.inputManager = new InputManager();
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

        let initialState;
        if (options.loadSlot) {
            const loadedState = await SaveManager.loadGame(options.loadSlot);
            initialState = loadedState || (await GameStateManager.createInitialState({ floor: 1 }));
        } else {
            initialState = await GameStateManager.createInitialState({ floor: 1 });
        }

        this.gameStateManager = new GameStateManager();
        this.gameStateManager.initializeState(initialState);
        this.playerEntityKey = Object.keys(initialState.entities).find(
            (k) => initialState.entities[k].type === 'player_start'
        );
        this.renderer.initialize(this.gameStateManager.getState());

        this.inputManager.on('action', (action) => this.handleAction(action));
    }

    private handleAction(action: any): void {
        if (this.isAnimating || !this.gameStateManager) {
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
                const newState = await GameStateManager.createInitialState(
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
        this.isAnimating = true;
        this.renderer.animateItemPickup(state, () => {
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
        // Narrow interactionState to the 'battle' variant so TS knows `turn` exists.
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

        const attacker = battleState.turn === 'player' ? player : monster;
        const defender = battleState.turn === 'player' ? monster : player;
        const attackerId =
            battleState.turn === 'player' ? this.playerEntityKey : battleState.monsterId;
        const defenderId =
            battleState.turn === 'player' ? battleState.monsterId : this.playerEntityKey;

        const damage = calculateDamage(attacker, defender);

        this.renderer.animateAttack(attackerId, defenderId, damage, () => {
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
