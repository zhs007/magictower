import { Application } from 'pixi.js';
import { BaseScene } from './base-scene';
import { StartScene } from './start-scene';
import { GameScene } from './game-scene';

type SceneConstructor = new (sceneManager: SceneManager) => BaseScene;

/**
 * Manages the scenes of the game, handling transitions and the current scene.
 */
export class SceneManager {
    private app: Application;
    private currentScene: BaseScene | null = null;
    private scenes: Record<string, SceneConstructor> = {};

    constructor(app: Application) {
        this.app = app;

        // Register all scenes
        this.scenes['start'] = StartScene;
        this.scenes['game'] = GameScene;
    }

    /**
     * Transitions to a new scene.
     * @param sceneName - The name of the scene to transition to.
     * @param options - Optional data to pass to the new scene's onEnter method.
     */
    public goTo(sceneName: string, options?: any): void {
        if (this.currentScene) {
            this.currentScene.onExit();
            this.app.stage.removeChild(this.currentScene);
            this.currentScene.destroy();
        }

        const SceneToAdd = this.scenes[sceneName];
        if (SceneToAdd) {
            this.currentScene = new SceneToAdd(this);
            this.app.stage.addChild(this.currentScene);
            this.currentScene.onEnter(options);
        } else {
            console.error(`Scene "${sceneName}" not found.`);
        }
    }

    /**
     * Optional: An update loop that can be driven by the main application ticker.
     * @param delta - The time elapsed since the last frame.
     */
    public update(delta: number): void {
        if (this.currentScene && this.currentScene.update) {
            this.currentScene.update(delta);
        }
    }
}
