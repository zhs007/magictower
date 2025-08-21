import { Container, Assets, Sprite } from 'pixi.js';
import { GameState, EntityType } from '../core/types';
import { dataManager } from '../data/data-manager';

const TILE_SIZE = 32;

export class Renderer {
    private stage: Container;

    constructor(stage: Container) {
        this.stage = stage;
    }

    public async loadAssets(): Promise<void> {
        await dataManager.loadAllData();

        const assetManifest = {
            bundles: [
                {
                    name: 'game-assets',
                    assets: [
                        { alias: 'player', src: 'assets/character/player.png' },
                        { alias: 'ground', src: 'assets/map/ground.png' },
                        { alias: 'wall', src: 'assets/map/wall.png' },
                    ],
                },
            ],
        };

        for (const [id] of dataManager.monsters) {
            assetManifest.bundles[0].assets.push({ alias: id, src: `assets/monster/${id}.png` });
        }

        for (const [id] of dataManager.items) {
            assetManifest.bundles[0].assets.push({ alias: id, src: `assets/item/${id}.png` });
        }

        for (const [id] of dataManager.equipments) {
            assetManifest.bundles[0].assets.push({ alias: id, src: `assets/equipment/${id}.png` });
        }

        await Assets.init({ manifest: assetManifest });
        await Assets.loadBundle('game-assets');
    }

    public render(state: GameState): void {
        this.stage.removeChildren();

        for (let y = 0; y < state.map.length; y++) {
            for (let x = 0; x < state.map[y].length; x++) {
                const tile = state.map[y][x];

                // Render ground layer
                const groundSprite = new Sprite(Assets.get(tile.groundLayer === 0 ? 'ground' : 'wall'));
                groundSprite.x = x * TILE_SIZE;
                groundSprite.y = y * TILE_SIZE;
                this.stage.addChild(groundSprite);

                // Render entity layer
                if (tile.entityLayer) {
                    let entitySprite: Sprite | undefined;
                    switch (tile.entityLayer.type) {
                        case EntityType.PLAYER:
                            entitySprite = new Sprite(Assets.get(state.player.id));
                            break;
                        case EntityType.MONSTER:
                            entitySprite = new Sprite(Assets.get(tile.entityLayer.id));
                            break;
                        case EntityType.ITEM:
                            entitySprite = new Sprite(Assets.get(tile.entityLayer.id));
                            break;
                        case EntityType.EQUIPMENT:
                            entitySprite = new Sprite(Assets.get(tile.entityLayer.id));
                            break;
                    }

                    if (entitySprite) {
                        entitySprite.x = x * TILE_SIZE;
                        entitySprite.y = y * TILE_SIZE;
                        this.stage.addChild(entitySprite);
                    }
                }
            }
        }
    }
}
