import { GameStateManager } from '../core/state';
import { Renderer } from '../renderer/renderer';
import { InputManager } from '../core/input-manager';
import { dataManager } from '../data/data-manager';
import { BaseScene } from './base-scene';
import { SceneManager } from './scene-manager';
import { SaveManager } from '../core/save-manager';
import { GameState } from '../core/types';
import { calculateDamage } from '../core/logic';

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
            initialState = loadedState || await GameStateManager.createInitialState({ floor: 1 });
        } else {
            initialState = await GameStateManager.createInitialState({ floor: 1 });
        }

        this.gameStateManager = new GameStateManager();
        this.gameStateManager.initializeState(initialState);
        this.playerEntityKey = Object.keys(initialState.entities).find(k => initialState.entities[k].type === 'player_start');
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

        switch (state.interactionState.type) {
            case 'item_pickup':
                this.handleItemPickup(state);
                break;
            case 'battle':
                this.handleBattle(state);
                break;
            default:
                this.renderer.render(state);
        }
    }

    private handleItemPickup(state: GameState): void {
        this.isAnimating = true;
        this.renderer.animateItemPickup(state, () => {
            if (this.gameStateManager && state.interactionState.type === 'item_pickup') {
                this.gameStateManager.dispatch({ type: 'PICK_UP_ITEM', payload: { itemId: state.interactionState.itemId } });
                this.renderer.render(this.gameStateManager.getState());
            }
            this.isAnimating = false;
        });
    }

    private handleBattle(state: GameState): void {
        if (!this.gameStateManager || !this.playerEntityKey) return;

        const battleState = state.interactionState;
        if (battleState.turn === 'battle_end') {
            const winnerId = battleState.playerHp > 0 ? 'player' : battleState.monsterId;
            this.gameStateManager.dispatch({ type: 'END_BATTLE', payload: { winnerId } });
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
        const attackerId = battleState.turn === 'player' ? this.playerEntityKey : battleState.monsterId;
        const defenderId = battleState.turn === 'player' ? battleState.monsterId : this.playerEntityKey;

        const damage = calculateDamage(attacker, defender);

        this.renderer.animateAttack(attackerId, defenderId, damage, () => {
            if (this.gameStateManager) {
                this.gameStateManager.dispatch({ type: 'ATTACK', payload: { attackerId: attacker.id, defenderId: defender.id } });
                const nextState = this.gameStateManager.getState();
                this.renderer.render(nextState);
                this.isAnimating = false;

                setTimeout(() => {
                    this.processInteraction(this.gameStateManager.getState());
                }, 0);
            }
        });
    }
}
