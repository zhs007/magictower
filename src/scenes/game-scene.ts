import { GameStateManager } from '../core/state';
import { Renderer } from '../renderer/renderer';
import { InputManager } from '../core/input-manager';
import { dataManager } from '../data/data-manager';
import { BaseScene } from './base-scene';
import { SceneManager } from './scene-manager';
import { SaveManager } from '../core/save-manager';

interface GameSceneOptions {
    newGame?: boolean;
    loadSlot?: string;
}

/**
 * The main scene for the game, handling the primary game loop.
 */
export class GameScene extends BaseScene {
    private gameStateManager: GameStateManager | null = null;
    private renderer: Renderer;
    private inputManager: InputManager;

    constructor(sceneManager: SceneManager) {
        super(sceneManager);

        // The renderer will now render to this scene's container
        this.renderer = new Renderer(this);
        this.inputManager = new InputManager();
    }

    public async onEnter(options: GameSceneOptions): Promise<void> {
        await this.initializeGame(options);
    }

    public onExit(): void {
        this.inputManager.destroy();
        this.renderer.destroy();
        // Ensure all children are removed from the stage
        this.removeChildren();
    }

    private async initializeGame(options: GameSceneOptions): Promise<void> {
        // Load all necessary game data and assets first
        await dataManager.loadAllData();
        await this.renderer.loadAssets();

        let initialState;
        if (options.loadSlot) {
            // Use the static loadGame method
            const loadedState = await SaveManager.loadGame(options.loadSlot);
            if (loadedState) {
                initialState = loadedState;
            } else {
                console.error(`Failed to load game from slot: ${options.loadSlot}. Starting a new game.`);
                initialState = await GameStateManager.createInitialState({ floor: 1 });
            }
        } else {
            // By default, or if newGame is explicitly true
            initialState = await GameStateManager.createInitialState({ floor: 1 });
        }

        this.gameStateManager = new GameStateManager();
        this.gameStateManager.initializeState(initialState);

        // Render the initial state
        this.renderer.render(this.gameStateManager.getState());

        // Set up the input listener to drive the game loop
        this.inputManager.on('action', (action) => {
            if (this.gameStateManager) {
                this.gameStateManager.dispatch(action);
                const newState = this.gameStateManager.getState();
                this.renderer.render(newState);
            }
        });
    }
}
