import { Container, Assets, Sprite, Texture } from 'pixi.js';
import type { GameState } from '@proj-tower/logic-core';
import { normalizeMapLayout } from '@proj-tower/logic-core';
import { Entity } from './entity';

const TILE_SIZE = 65;

export class MapRender extends Container {
    private floorContainer: Container;
    public entityContainer: Container;
    private entities: Set<Entity> = new Set();
    private mapEntities: Entity[] = [];

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

        for (const entity of this.mapEntities) {
            this.removeEntity(entity);
        }
        this.mapEntities = [];

        const mapLayout = normalizeMapLayout(state.map, {
            floor: state.currentFloor,
            tileAssets: state.tileAssets,
        });
        const mapGrid = mapLayout.layout;
        const tileAssets = mapLayout.tileAssets ?? state.tileAssets ?? {};
        const useNewTiles = Object.keys(tileAssets).length > 0;

        for (let y = 0; y < mapGrid.length; y++) {
            for (let x = 0; x < mapGrid[y].length; x++) {
                const tileValue = mapGrid[y][x];
                let tileTexture;
                let isEntity = false;

                if (useNewTiles) {
                    const assetKey =
                        tileValue === undefined || tileValue === null
                            ? undefined
                            : typeof tileValue === 'string'
                              ? tileValue
                              : String(tileValue);
                    const tileAsset = assetKey ? tileAssets[assetKey] : undefined;
                    if (tileAsset) {
                        tileTexture = Assets.get(tileAsset.assetId);
                        isEntity = tileAsset.isEntity;
                    } else {
                        // Fallback to floor tile if tileValue is not in tileAssets
                        const floorTileAsset = tileAssets['0'];
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
                    const floorAsset = useNewTiles ? tileAssets['0'] : { assetId: 'map_floor', isEntity: false };
                    const floorTexture = Assets.get(floorAsset.assetId);
                    const floorSprite = new Sprite(floorTexture);
                    floorSprite.x = x * TILE_SIZE;
                    floorSprite.y = y * TILE_SIZE;
                    floorSprite.width = TILE_SIZE;
                    floorSprite.height = TILE_SIZE;
                    this.floorContainer.addChild(floorSprite);

                    // Create an entity for the tile
                    const entity = new Entity();
                    const sprite = new Sprite(tileTexture);
                    sprite.anchor.set(0.5, 1); // Bottom-center
                    entity.addChild(sprite);

                    entity.x = x * TILE_SIZE + TILE_SIZE / 2;
                    entity.y = (y + 1) * TILE_SIZE;
                    entity.zIndex = y; // For correct occlusion

                    this.addEntity(entity);
                    this.mapEntities.push(entity);
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
