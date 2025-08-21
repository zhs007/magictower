import { Application } from 'pixi.js';
import { GameStateManager } from '../core/state';
import { Renderer } from '../renderer/renderer';
import { InputManager } from '../core/input-manager';
import { dataManager } from '../data/data-manager';

/**
 * The main scene for the game, handling the primary game loop.
 */
export class GameScene {
    private app: Application;
    private gameStateManager: GameStateManager | null = null;
    private renderer: Renderer;
    private inputManager: InputManager;

    constructor(app: Application) {
        this.app = app;
        this.renderer = new Renderer(this.app.stage);
        this.inputManager = new InputManager();
    }

    /**
     * Initializes and starts the game scene.
     */
    public async start(): Promise<void> {
        // Load all necessary game data and assets first
        await dataManager.loadAllData();
        await this.renderer.loadAssets();

        // Create the initial game state
        const initialState = await GameStateManager.createInitialState(1);
        this.gameStateManager = new GameStateManager(initialState);

        // Render the initial state
        this.renderer.render(this.gameStateManager.getState());

        // Set up the input listener to drive the game loop
        this.inputManager.on('action', (action) => {
            if (this.gameStateManager) {
                // 1. Dispatch the action to the logic core
                this.gameStateManager.dispatch(action);

                // 2. Get the new state and render it
                const newState = this.gameStateManager.getState();
                this.renderer.render(newState);
            }
        });
    }

    /**
     * Cleans up resources used by the scene.
     */
    public destroy(): void {
        this.inputManager.destroy();
        // Other cleanup if needed
    }
}
