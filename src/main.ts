import { Application } from 'pixi.js';
import { GameScene } from './scenes/game-scene';

/**
 * The main entry point of the application.
 */
async function main() {
    // Create a new Pixi.js application
    const app = new Application();

    // Find the canvas element
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) {
        console.error('Could not find canvas element with id "game-canvas"');
        return;
    }

    // Initialize the application
    await app.init({
        canvas,
        width: 540, // Common mobile resolution width
        height: 960, // Common mobile resolution height
        backgroundColor: 0x1099bb,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
    });

    // Create and start the main game scene
    const gameScene = new GameScene(app);
    await gameScene.start();
}

// Run the main function
main();
