import { Container, Assets, Sprite, Text, Texture } from 'pixi.js';
import { GameState } from '../core/types';
import { dataManager } from '../data/data-manager';
import { HUD } from './ui/hud';
import { gsap } from 'gsap';
import { FloatingTextManager } from './ui/floating-text-manager';

const TILE_SIZE = 65;
const MAP_WIDTH_TILES = 16;
const MAP_OFFSET_X = 20;

export class Renderer {
    private stage: Container;
    private floorContainer: Container;
    private mainContainer: Container;
    private topLayerContainer: Container;
    private hud: HUD;
    private floatingTextManager: FloatingTextManager;

    private entitySprites: Map<string, Sprite> = new Map();

    constructor(stage: Container) {
        this.stage = stage;
        this.floorContainer = new Container();
        this.mainContainer = new Container();
        this.topLayerContainer = new Container();
        this.hud = new HUD();
        this.floatingTextManager = new FloatingTextManager(this.topLayerContainer);

        this.mainContainer.sortableChildren = true;
        this.topLayerContainer.sortableChildren = true;

        const worldContainer = new Container();
        worldContainer.x = MAP_OFFSET_X;
        worldContainer.y = 200;
        worldContainer.addChild(this.floorContainer, this.mainContainer, this.topLayerContainer);

        this.hud.y = MAP_WIDTH_TILES * TILE_SIZE + worldContainer.y;

        this.stage.addChild(worldContainer, this.hud);
    }

    public async loadAssets(): Promise<void> {
        await dataManager.loadAllData();

        // Auto-generate asset manifest: alias = <folder>_<filename> for files under subfolders,
        // or filename for top-level assets (e.g. 'player'). Use import.meta.glob to get URLs.
        const modules = import.meta.glob('/assets/**/*.{png,jpg,jpeg,webp}', {
            eager: true,
            query: '?url',
            import: 'default',
        }) as Record<string, string>;
        const assetsList: { alias: string; src: string }[] = [];
        for (const p in modules) {
            const url = modules[p];
            const parts = p.split('/');
            const filenameWithExt = parts[parts.length - 1];
            const filename = filenameWithExt.replace(/\.[^.]+$/, '');
            const folder = parts.length >= 3 ? parts[parts.length - 2] : '';
            const alias = folder && folder !== 'assets' ? `${folder}_${filename}` : filename;
            assetsList.push({ alias, src: url });
        }

        const assetManifest = { bundles: [{ name: 'game-assets', assets: assetsList }] };
        await Assets.init({ manifest: assetManifest });
        await Assets.loadBundle('game-assets');
    }

    public initialize(state: GameState): void {
        this.drawMap(state);
        this.syncSprites(state);
        this.hud.update(state);
    }

    // Resolve texture alias: try <folder>_<base> then fallback to base.
    private resolveTextureAlias(base: string, folder?: string) {
        if (folder) {
            const withFolder = `${folder}_${base}`;
            const t = Assets.get(withFolder);
            if (t) return t;
        }
        return Assets.get(base);
    }

    private wallSprites: Sprite[] = [];

    private drawMap(state: GameState): void {
        this.floorContainer.removeChildren();

        // Clear previous wall sprites
        for (const sprite of this.wallSprites) {
            this.mainContainer.removeChild(sprite);
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
                        // Fallback for tiles not in tileAssets (e.g. treat as floor)
                        const floorAssetId = state.tileAssets!['0'];
                        tileTexture = floorAssetId ? Assets.get(floorAssetId) : Texture.EMPTY;
                    }
                } else {
                    // Fallback to old system
                    if (tileValue === 1) {
                        tileTexture = this.resolveTextureAlias('wall', 'map');
                    } else {
                        tileTexture = this.resolveTextureAlias('floor', 'map');
                    }
                }

                if (tileValue === 0) {
                    // It's a floor tile
                    const floorSprite = new Sprite(tileTexture);
                    floorSprite.x = x * TILE_SIZE;
                    floorSprite.y = y * TILE_SIZE;
                    floorSprite.width = TILE_SIZE;
                    floorSprite.height = TILE_SIZE;
                    this.floorContainer.addChild(floorSprite);
                } else if (tileValue === 1) {
                    // Always draw a floor tile underneath walls
                    const floorAssetId = useNewTiles
                        ? state.tileAssets!['0']
                        : this.resolveTextureAlias('floor', 'map');
                    const floorTexture = useNewTiles ? Assets.get(floorAssetId) : floorAssetId;
                    const floorSprite = new Sprite(floorTexture);
                    floorSprite.x = x * TILE_SIZE;
                    floorSprite.y = y * TILE_SIZE;
                    floorSprite.width = TILE_SIZE;
                    floorSprite.height = TILE_SIZE;
                    this.floorContainer.addChild(floorSprite);

                    // It's a wall
                    const wallSprite = new Sprite(tileTexture);
                    wallSprite.anchor.set(0.5, 1); // Bottom-center
                    wallSprite.x = x * TILE_SIZE + TILE_SIZE / 2;
                    wallSprite.y = (y + 1) * TILE_SIZE;
                    wallSprite.zIndex = y;
                    this.mainContainer.addChild(wallSprite);
                    this.wallSprites.push(wallSprite);
                }
            }
        }
    }

    public syncSprites(state: GameState): void {
        const allEntityIds = new Set(Object.keys(state.entities));
        const processedSpriteIds = new Set();

        for (const entityId of allEntityIds) {
            const entity = state.entities[entityId];
            if (!entity) continue;

            processedSpriteIds.add(entityId);
            let sprite = this.entitySprites.get(entityId);

            if (!sprite) {
                let textureAlias = '';
                if (entity.type === 'player_start') textureAlias = 'player';
                else {
                    const candidate = (entity as any).assetId ?? entity.id;
                    if (
                        entity.type === 'monster' ||
                        entity.type === 'item' ||
                        dataManager.getItemData(entity.id)
                    ) {
                        textureAlias = candidate;
                    }
                }

                if (textureAlias) {
                    sprite = new Sprite(Assets.get(textureAlias));
                    sprite.anchor.set(0.5, 1); // Bottom-center alignment
                    this.entitySprites.set(entityId, sprite);
                    this.mainContainer.addChild(sprite);
                }
            }

            if (sprite) {
                sprite.x = entity.x * TILE_SIZE + TILE_SIZE / 2;
                sprite.y = (entity.y + 1) * TILE_SIZE;
                sprite.zIndex = entity.y;
                sprite.visible = true;

                // Handle direction for characters
                if ('direction' in entity) {
                    sprite.scale.x = entity.direction === 'left' ? -1 : 1;
                    sprite.scale.y = 1;
                }
            }
        }

        // Hide or remove sprites for entities that no longer exist
        for (const [entityId, sprite] of this.entitySprites.entries()) {
            if (!allEntityIds.has(entityId)) {
                sprite.visible = false;
                // Optional: remove from container and map if they won't reappear
                // this.mainContainer.removeChild(sprite);
                // this.entitySprites.delete(entityId);
            }
        }
    }

    public render(state: GameState): void {
        this.syncSprites(state);
        // The HUD is now event-driven and does not need a manual render call.
        // this.hud.update(state);
    }

    public async animateItemPickup(state: GameState, onComplete: () => void): Promise<void> {
        if (state.interactionState.type !== 'item_pickup') return;

        const playerKey = Object.keys(state.entities).find(
            (k) => state.entities[k].type === 'player_start'
        );
        if (!playerKey) return;

        const player = state.entities[playerKey];
        const playerSprite = this.entitySprites.get(playerKey);
        const itemSprite = this.entitySprites.get(state.interactionState.itemId);

        if (!playerSprite || !itemSprite) {
            onComplete();
            return;
        }

        const item = state.entities[state.interactionState.itemId];
        if (!item) {
            onComplete();
            return;
        }

        const targetX = item.x * TILE_SIZE + TILE_SIZE / 2;
        const targetY = (item.y + 1) * TILE_SIZE;

        const tl = gsap.timeline({ onComplete });
        const duration = 0.3;

        if (player.x === item.x) {
            // Vertical Jumps
            let jumpHeight;
            let peakY;
            if (player.y > item.y) {
                // Jumping UP (e.g. from y=2 to y=1)
                jumpHeight = TILE_SIZE / 4;
                peakY = targetY - jumpHeight; // Peak is relative to destination
            } else {
                // Jumping DOWN (e.g. from y=1 to y=2)
                jumpHeight = TILE_SIZE / 4;
                peakY = playerSprite.y - jumpHeight; // Peak is relative to start
            }
            tl.to(playerSprite, { y: peakY, duration: duration / 2, ease: 'power1.out' }).to(
                playerSprite,
                { y: targetY, duration: duration / 2, ease: 'power1.in' }
            );
        } else {
            // Horizontal or Diagonal Jumps (Symmetric Arc)
            const jumpHeight = TILE_SIZE / 2;
            const peakY = playerSprite.y - jumpHeight;
            tl.to(playerSprite, { x: targetX, duration: duration, ease: 'linear' }, 0);
            tl.to(playerSprite, { y: peakY, duration: duration / 2, ease: 'power1.out' }, 0).to(
                playerSprite,
                { y: targetY, duration: duration / 2, ease: 'power1.in' }
            );
        }

        // Item fade-out animation runs concurrently
        tl.to(
            itemSprite,
            {
                y: targetY - TILE_SIZE,
                alpha: 0,
                duration: duration,
                ease: 'power1.in',
            },
            0
        );
    }

    public async animateAttack(
        attackerId: string,
        defenderId: string,
        damage: number,
        onComplete: () => void
    ): Promise<void> {
        const attackerSprite = this.entitySprites.get(attackerId);
        const defenderSprite = this.entitySprites.get(defenderId);

        if (!attackerSprite || !defenderSprite) {
            onComplete();
            return;
        }

        const originalX = attackerSprite.x;
        const originalY = attackerSprite.y;
        const targetX = defenderSprite.x;
        const targetY = defenderSprite.y;

        const tl = gsap.timeline({ onComplete });

        tl.to(attackerSprite, {
            x: (originalX + targetX) / 2,
            y: (originalY + targetY) / 2,
            duration: 0.15,
            ease: 'power1.in',
            yoyo: true,
            repeat: 1,
        });

        tl.to(
            defenderSprite,
            {
                tint: 0xff0000,
                duration: 0.1,
                yoyo: true,
                repeat: 1,
            },
            '-=0.1'
        );

        this.floatingTextManager.add(`-${damage}`, 'DAMAGE', {
            x: defenderSprite.x,
            y: defenderSprite.y - TILE_SIZE,
        });
    }

    public showFloatingTextOnEntity(
        text: string,
        type: 'ITEM_GAIN' | 'STAT_INCREASE' | 'HEAL',
        entityId: string
    ): void {
        const sprite = this.entitySprites.get(entityId);
        if (sprite) {
            this.floatingTextManager.add(text, type, {
                x: sprite.x,
                y: sprite.y - TILE_SIZE,
            });
        }
    }

    public moveToTopLayer(sprite: Sprite): void {
        if (sprite.parent === this.mainContainer) {
            this.mainContainer.removeChild(sprite);
            this.topLayerContainer.addChild(sprite);
        }
    }

    public moveToMainLayer(sprite: Sprite): void {
        if (sprite.parent === this.topLayerContainer) {
            this.topLayerContainer.removeChild(sprite);
            this.mainContainer.addChild(sprite);
        }
    }
}
