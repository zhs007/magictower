import './style.css';
import { Application } from 'pixi.js';
import { GameScene } from './scenes/game-scene';

/**
 * The main entry point of the application.
 */
async function main() {
    // Create a new Pixi.js application with a fixed design resolution
    const app = new Application();

    await app.init({
        width: 1080,
        height: 1920,
        backgroundColor: 0x000000,
        resolution: 1, // Use a fixed resolution
    });

    // Append the app's view to the #app div
    const appContainer = document.getElementById('app');
    if (appContainer) {
        appContainer.appendChild(app.canvas);
    } else {
        console.error('Could not find element with id "app"');
        return;
    }

    // Create and start the main game scene
    const gameScene = new GameScene(app);
    await gameScene.start();
}

// Run the main function
main();
