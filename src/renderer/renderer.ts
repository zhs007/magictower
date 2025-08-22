import { Container, Assets, Sprite, Graphics, Text } from 'pixi.js';
import { GameState, EntityType } from '../core/types';
import { dataManager } from '../data/data-manager';

const TILE_SIZE = 65; // Logical size 16x16, rendered at 65x65
const MAP_WIDTH_TILES = 16;
const MAP_OFFSET_X = 20;

export class Renderer {
    private stage: Container;
    private mapContainer: Container;
    private hudContainer: Container;

    constructor(stage: Container) {
        this.stage = stage;
        this.mapContainer = new Container();
        this.hudContainer = new Container();

        this.mapContainer.x = MAP_OFFSET_X;
        this.mapContainer.y = 200; // Placeholder Y, adjust as needed

        this.hudContainer.y = (MAP_WIDTH_TILES * TILE_SIZE) + this.mapContainer.y; // Position HUD below map

        this.stage.addChild(this.mapContainer);
        this.stage.addChild(this.hudContainer);
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
        this.mapContainer.removeChildren();
        this.hudContainer.removeChildren();

        // Render Map
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

        // Render HUD
        const hudBackground = new Graphics();
        hudBackground.fill(0x000000);
        hudBackground.drawRect(0, 0, 1080, 400); // Simple black bar for HUD
        hudBackground.fill();
        this.hudContainer.addChild(hudBackground);

        const hpText = new Text(`HP: ${state.player.hp}`, { fill: 'white', fontSize: 48 });
        hpText.x = 50;
        hpText.y = 50;
        this.hudContainer.addChild(hpText);
    }
}
