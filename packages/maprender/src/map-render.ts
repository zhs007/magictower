import { Container, Assets, Sprite, Texture } from 'pixi.js';
import type { GameState } from '@proj-tower/logic-core';

const TILE_SIZE = 65;

export class MapRender extends Container {
    private floorContainer: Container;
    public entityContainer: Container;
    private wallSprites: Sprite[] = [];

    constructor(state: GameState) {
        super();
        this.floorContainer = new Container();
        this.entityContainer = new Container();
        this.entityContainer.sortableChildren = true;

        this.addChild(this.floorContainer, this.entityContainer);

        this.drawMap(state);
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

                if (useNewTiles) {
                    const assetId = state.tileAssets![tileValue];
                    if (assetId) {
                        tileTexture = Assets.get(assetId);
                    } else {
                        const floorAssetId = state.tileAssets!['0'];
                        tileTexture = floorAssetId ? Assets.get(floorAssetId) : Texture.EMPTY;
                    }
                } else {
                    if (tileValue === 1) {
                        tileTexture = Assets.get('map_wall');
                    } else {
                        tileTexture = Assets.get('map_floor');
                    }
                }

                if (tileValue === 0) {
                    const floorSprite = new Sprite(tileTexture);
                    floorSprite.x = x * TILE_SIZE;
                    floorSprite.y = y * TILE_SIZE;
                    floorSprite.width = TILE_SIZE;
                    floorSprite.height = TILE_SIZE;
                    this.floorContainer.addChild(floorSprite);
                } else if (tileValue === 1) {
                    const floorAssetId = useNewTiles ? state.tileAssets!['0'] : 'map_floor';
                    const floorTexture = Assets.get(floorAssetId);
                    const floorSprite = new Sprite(floorTexture);
                    floorSprite.x = x * TILE_SIZE;
                    floorSprite.y = y * TILE_SIZE;
                    floorSprite.width = TILE_SIZE;
                    floorSprite.height = TILE_SIZE;
                    this.floorContainer.addChild(floorSprite);

                    const wallSprite = new Sprite(tileTexture);
                    wallSprite.anchor.set(0.5, 1); // Bottom-center
                    wallSprite.x = x * TILE_SIZE + TILE_SIZE / 2;
                    wallSprite.y = (y + 1) * TILE_SIZE;
                    wallSprite.zIndex = y;
                    this.entityContainer.addChild(wallSprite);
                    this.wallSprites.push(wallSprite);
                }
            }
        }
    }
}
