import { Container } from 'pixi.js';
import { SceneManager } from './scene-manager';

/**
 * An abstract base class for all scenes in the game.
 * Each scene is a container that manages its own display objects and lifecycle.
 */
export abstract class BaseScene extends Container {
    protected sceneManager: SceneManager;

    constructor(sceneManager: SceneManager) {
        super();
        this.sceneManager = sceneManager;
    }

    /**
     * Called when the scene is created and added to the stage.
     * Use this to initialize assets, set up the scene, etc.
     */
    public abstract onEnter(options?: any): void;

    /**
     * Called when the scene is about to be destroyed and removed from the stage.
     * Use this to clean up any resources.
     */
    public abstract onExit(): void;

    /**
     * An optional update method that can be called on each frame.
     * @param delta - The time elapsed since the last frame.
     */
    public update?(delta: number): void;
}
