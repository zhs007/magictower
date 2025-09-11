import './style.css';
import { Application, Ticker } from 'pixi.js';
import { SceneManager } from './scenes/scene-manager';
import { AudioManager } from './core/audio-manager';

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

    // Initialize the scene manager
    const sceneManager = new SceneManager(app);

    // Set up the game loop
    Ticker.shared.add((ticker) => {
        sceneManager.update(ticker.deltaTime);
    });

    // Initialize the audio manager and load sounds
    const audioManager = AudioManager.getInstance();
    audioManager.loadSounds();

    // Go to the start scene
    sceneManager.goTo('start');
}

// Run the main function
main();
