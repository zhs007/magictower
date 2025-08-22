import { Container, Assets, Sprite } from 'pixi.js';
import { GameState } from '../core/types';
import { dataManager } from '../data/data-manager';
import { HUD } from './ui/hud';

const TILE_SIZE = 65; // Logical size 16x16, rendered at 65x65
const MAP_WIDTH_TILES = 16;
const MAP_OFFSET_X = 20;

export class Renderer {
    private stage: Container;
    private mapContainer: Container;
    private hud: HUD;

    constructor(stage: Container) {
        this.stage = stage;
        this.mapContainer = new Container();
        this.hud = new HUD();

        this.mapContainer.x = MAP_OFFSET_X;
        this.mapContainer.y = 200; // Placeholder Y, adjust as needed

        this.hud.y = (MAP_WIDTH_TILES * TILE_SIZE) + this.mapContainer.y; // Position HUD below map

        this.stage.addChild(this.mapContainer);
        this.stage.addChild(this.hud);
    }

    public async loadAssets(): Promise<void> {
        await dataManager.loadAllData();

        const assetManifest = {
            bundles: [
                {
                    name: 'game-assets',
                    assets: [
                        { alias: 'player', src: 'assets/player.png' },
                        { alias: 'wall', src: 'assets/map/wall.png' },
                        { alias: 'floor', src: 'assets/map/floor.png' },
                        { alias: 'monster_green_slime', src: 'assets/monster/monster.png' },
                        { alias: 'item_yellow_key', src: 'assets/item/item.png' },
                    ],
                },
            ],
        };

        // This logic is simplified as we are using generic monster/item images for now
        // A more robust system would map specific monster IDs to specific asset files

        await Assets.init({ manifest: assetManifest });
        await Assets.loadBundle('game-assets');
    }

    public render(state: GameState): void {
        // Clear the map container for the next frame
        this.mapContainer.removeChildren();

        // Render Map Tiles
        for (let y = 0; y < state.map.length; y++) {
            for (let x = 0; x < state.map[y].length; x++) {
                const tileValue = state.map[y][x];
                const tileSprite = new Sprite(Assets.get(tileValue === 1 ? 'wall' : 'floor'));
                tileSprite.x = x * TILE_SIZE;
                tileSprite.y = y * TILE_SIZE;
                tileSprite.width = TILE_SIZE;
                tileSprite.height = TILE_SIZE;
                this.mapContainer.addChild(tileSprite);
            }
        }

        // Render Entities
        for (const entity of Object.values(state.entities)) {
            if (!entity) continue;
            let entitySprite: Sprite | undefined;
            if (entity.type === 'player_start') {
                entitySprite = new Sprite(Assets.get('player'));
            } else if (entity.type === 'monster') {
                entitySprite = new Sprite(Assets.get(entity.id));
            } else if (entity.type === 'item') {
                entitySprite = new Sprite(Assets.get(entity.id));
            }

            if (entitySprite) {
                entitySprite.x = entity.x * TILE_SIZE;
                entitySprite.y = entity.y * TILE_SIZE;
                entitySprite.width = TILE_SIZE;
                entitySprite.height = TILE_SIZE;
                this.mapContainer.addChild(entitySprite);
            }
        }

        // Update the HUD with the new state
        this.hud.update(state);
    }
}
