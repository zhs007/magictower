import { describe, it, expect, vi, beforeEach } from 'vitest';
// NOTE: SceneManager is NOT imported at the top level.
import { BaseScene } from '../base-scene';
import { Application } from 'pixi.js';

// Define a mock scene class that can be instantiated.
// It must have all the methods that SceneManager calls on a scene.
class MockScene extends BaseScene {
    constructor(sceneManager: any) {
        // Pass a dummy manager to the super constructor.
        super(sceneManager);
    }
    onEnter = vi.fn();
    onExit = vi.fn();
    update = vi.fn();
    // We must also mock destroy(), as it's called on the scene instance.
    // The real destroy() is part of PIXI.Container.
    destroy = vi.fn();
}

// Use vi.doMock(), which is NOT hoisted. This means it will be executed
// in order, after MockScene has been defined.
vi.doMock('../start-scene', () => ({ StartScene: MockScene }));
vi.doMock('../game-scene', () => ({ GameScene: MockScene }));


describe('SceneManager', () => {
    let appMock: Application;
    let SceneManager: any;
    let sceneManager: any;

    // This block runs before each test. It's async to allow for dynamic import.
    beforeEach(async () => {
        // Dynamically import SceneManager AFTER the mocks are set up.
        const smModule = await import('../scene-manager');
        SceneManager = smModule.SceneManager;

        // Create a mock for the Pixi Application
        appMock = {
            stage: {
                addChild: vi.fn(),
                removeChild: vi.fn(),
            },
        } as any;

        // Now we can create an instance of the real SceneManager
        sceneManager = new SceneManager(appMock);
    });

    it('should be created successfully', () => {
        expect(sceneManager).toBeInstanceOf(SceneManager);
    });

    it('should transition to a new scene', () => {
        sceneManager.goTo('start');

        expect(appMock.stage.addChild).toHaveBeenCalledTimes(1);
        const newSceneInstance = (appMock.stage.addChild as any).mock.calls[0][0];
        expect(newSceneInstance).toBeInstanceOf(MockScene);
        expect(newSceneInstance.onEnter).toHaveBeenCalledTimes(1);
    });

    it('should pass options to the new scene', () => {
        const options = { some: 'data' };
        sceneManager.goTo('game', options);

        expect(appMock.stage.addChild).toHaveBeenCalledTimes(1);
        const newSceneInstance = (appMock.stage.addChild as any).mock.calls[0][0];
        expect(newSceneInstance.onEnter).toHaveBeenCalledWith(options);
    });

    it('should clean up the old scene when transitioning', () => {
        sceneManager.goTo('start');
        const oldSceneInstance = (appMock.stage.addChild as any).mock.calls[0][0];

        sceneManager.goTo('game');

        expect(oldSceneInstance.onExit).toHaveBeenCalledTimes(1);
        expect(appMock.stage.removeChild).toHaveBeenCalledWith(oldSceneInstance);
        expect(oldSceneInstance.destroy).toHaveBeenCalledTimes(1);
        expect(appMock.stage.addChild).toHaveBeenCalledTimes(2);
    });

    it('should call the update method of the current scene', () => {
        sceneManager.goTo('start');
        const sceneInstance = (appMock.stage.addChild as any).mock.calls[0][0];

        const deltaTime = 16.67;
        sceneManager.update(deltaTime);

        expect(sceneInstance.update).toHaveBeenCalledWith(deltaTime);
    });

    it('should log an error if scene is not found', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        sceneManager.goTo('non-existent-scene');

        expect(consoleErrorSpy).toHaveBeenCalledWith('Scene "non-existent-scene" not found.');
        expect(appMock.stage.addChild).not.toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
    });
});
