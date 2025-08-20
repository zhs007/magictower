import { Application } from 'pixi.js';

// Create a new application
const app = new Application();

// Get the canvas element
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

// Initialize the application
await app.init({
    canvas,
    width: 800,
    height: 600,
    backgroundColor: 0x1099bb,
    resolution: window.devicePixelRatio || 1,
});
