import { Container, Assets, Sprite, Texture } from 'pixi.js';
import type { GameState } from '@proj-tower/logic-core';
import { Entity } from './entity';

const TILE_SIZE = 65;

export class MapRender extends Container {
    private floorContainer: Container;
    public entityContainer: Container;
    private wallSprites: Sprite[] = [];
    private entities: Set<Entity> = new Set();

    constructor(state: GameState) {
        super();
        this.floorContainer = new Container();
        this.entityContainer = new Container();
        this.entityContainer.sortableChildren = true;

        this.addChild(this.floorContainer, this.entityContainer);

        this.drawMap(state);
    }

    public addEntity(entity: Entity): void {
        this.entities.add(entity);
        this.entityContainer.addChild(entity);
    }

    public removeEntity(entity: Entity): void {
        this.entities.delete(entity);
        this.entityContainer.removeChild(entity);
    }

    public update(deltaTime: number): void {
        for (const entity of this.entities) {
            entity.update(deltaTime);
        }
    }

    private drawMap(state: GameState): void {
        this.floorContainer.removeChildren();

        for (const sprite of this.wallSprites) {
            this.entityContainer.removeChild(sprite);
        }
        this.wallSprites = [];

        const useNewTiles = state.tileAssets && Object.keys(state.tileAssets).length > 0;

        for (let y = 0; y < state.map.length; y++) {
            for (let x = 0; x < state.map[y].length; x++) {
                const tileValue = state.map[y][x];
                let tileTexture;
                let isEntity = false;

                if (useNewTiles) {
                    const tileAsset = state.tileAssets![tileValue];
                    if (tileAsset) {
                        tileTexture = Assets.get(tileAsset.assetId);
                        isEntity = tileAsset.isEntity;
                    } else {
                        // Fallback to floor tile if tileValue is not in tileAssets
                        const floorTileAsset = state.tileAssets!['0'];
                        tileTexture = floorTileAsset ? Assets.get(floorTileAsset.assetId) : Texture.EMPTY;
                    }
                } else {
                    // Legacy support for maps without tileAssets
                    if (tileValue === 1) {
                        tileTexture = Assets.get('map_wall');
                        isEntity = true;
                    } else {
                        tileTexture = Assets.get('map_floor');
                    }
                }

                if (isEntity) {
                    // Always draw a floor tile underneath an entity tile
                    const floorAsset = useNewTiles ? state.tileAssets!['0'] : { assetId: 'map_floor', isEntity: false };
                    const floorTexture = Assets.get(floorAsset.assetId);
                    const floorSprite = new Sprite(floorTexture);
                    floorSprite.x = x * TILE_SIZE;
                    floorSprite.y = y * TILE_SIZE;
                    floorSprite.width = TILE_SIZE;
                    floorSprite.height = TILE_SIZE;
                    this.floorContainer.addChild(floorSprite);

                    // Draw the entity tile itself
                    const entitySprite = new Sprite(tileTexture);
                    entitySprite.anchor.set(0.5, 1); // Bottom-center
                    entitySprite.x = x * TILE_SIZE + TILE_SIZE / 2;
                    entitySprite.y = (y + 1) * TILE_SIZE;
                    entitySprite.zIndex = y; // For correct occlusion
                    this.entityContainer.addChild(entitySprite);
                    this.wallSprites.push(entitySprite); // Keep track to remove them later
                } else {
                    // Just draw a floor tile
                    const floorSprite = new Sprite(tileTexture);
                    floorSprite.x = x * TILE_SIZE;
                    floorSprite.y = y * TILE_SIZE;
                    floorSprite.width = TILE_SIZE;
                    floorSprite.height = TILE_SIZE;
                    this.floorContainer.addChild(floorSprite);
                }
            }
        }
    }
}
