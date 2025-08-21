import { Application } from 'pixi.js';
import { Renderer } from './renderer/renderer';
import { GameState, EntityType, IPlayer, IMonster, IItem } from './core/types';

async function main() {
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

    // Create a new renderer
    const renderer = new Renderer(app.stage);

    // Load assets
    await renderer.loadAssets();

    const player: IPlayer = {
        id: 'player',
        name: 'Player',
        hp: 100,
        attack: 10,
        defense: 5,
        x: 1,
        y: 1,
        equipment: {},
        backupEquipment: [],
        buffs: [],
    };

    const monster: IMonster = {
        id: 'monster_green_slime',
        name: 'Green Slime',
        hp: 10,
        attack: 3,
        defense: 1,
        x: 3,
        y: 1,
        equipment: {},
        backupEquipment: [],
        buffs: [],
    };

    const item: IItem = {
        id: 'item_yellow_key',
        name: 'Yellow Key',
        type: 'key',
        color: 'yellow',
    };

    // Create a static GameState for testing
    const testGameState: GameState = {
        currentFloor: 1,
        map: [
            [{ groundLayer: 1 }, { groundLayer: 1 }, { groundLayer: 1 }, { groundLayer: 1 }, { groundLayer: 1 }],
            [{ groundLayer: 1 }, { groundLayer: 0, entityLayer: { type: EntityType.PLAYER, id: 'player' } }, { groundLayer: 0 }, { groundLayer: 0, entityLayer: { type: EntityType.MONSTER, id: 'monster_green_slime' } }, { groundLayer: 1 }],
            [{ groundLayer: 1 }, { groundLayer: 0 }, { groundLayer: 1 }, { groundLayer: 0 }, { groundLayer: 1 }],
            [{ groundLayer: 1 }, { groundLayer: 0, entityLayer: { type: EntityType.ITEM, id: 'item_yellow_key' } }, { groundLayer: 0 }, { groundLayer: 0 }, { groundLayer: 1 }],
            [{ groundLayer: 1 }, { groundLayer: 1 }, { groundLayer: 1 }, { groundLayer: 1 }, { groundLayer: 1 }],
        ],
        player: player,
        monsters: { [monster.id]: monster },
        items: { [item.id]: item },
        equipments: {},
        doors: {},
    };

    // Game loop
    app.ticker.add(() => {
        renderer.render(testGameState);
    });
}

main();
