import { Container, Assets, Sprite, Text } from 'pixi.js';
import { GameState } from '../core/types';
import { dataManager } from '../data/data-manager';
import { HUD } from './ui/hud';
import { gsap } from 'gsap';

const TILE_SIZE = 65;
const MAP_WIDTH_TILES = 16;
const MAP_OFFSET_X = 20;

export class Renderer {
    private stage: Container;
    private floorContainer: Container;
    private mainContainer: Container;
    private topLayerContainer: Container;
    private hud: HUD;

    private entitySprites: Map<string, Sprite> = new Map();

    constructor(stage: Container) {
        this.stage = stage;
        this.floorContainer = new Container();
        this.mainContainer = new Container();
        this.topLayerContainer = new Container();
        this.hud = new HUD();

        this.mainContainer.sortableChildren = true;
        this.topLayerContainer.sortableChildren = true;

        const worldContainer = new Container();
        worldContainer.x = MAP_OFFSET_X;
        worldContainer.y = 200;
        worldContainer.addChild(this.floorContainer, this.mainContainer, this.topLayerContainer);

        this.hud.y = (MAP_WIDTH_TILES * TILE_SIZE) + worldContainer.y;

        this.stage.addChild(worldContainer, this.hud);
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

        await Assets.init({ manifest: assetManifest });
        await Assets.loadBundle('game-assets');
    }

    public initialize(state: GameState): void {
        this.drawMap(state);
        this.syncSprites(state);
        this.hud.update(state);
    }

    private wallSprites: Sprite[] = [];

    private drawMap(state: GameState): void {
        this.floorContainer.removeChildren();

        // Clear previous wall sprites
        for (const sprite of this.wallSprites) {
            this.mainContainer.removeChild(sprite);
        }
        this.wallSprites = [];

        for (let y = 0; y < state.map.length; y++) {
            for (let x = 0; x < state.map[y].length; x++) {
                const tileValue = state.map[y][x];

                // Always draw a floor tile
                const floorSprite = new Sprite(Assets.get('floor'));
                floorSprite.x = x * TILE_SIZE;
                floorSprite.y = y * TILE_SIZE;
                floorSprite.width = TILE_SIZE;
                floorSprite.height = TILE_SIZE;
                this.floorContainer.addChild(floorSprite);

                if (tileValue === 1) { // It's a wall
                    const wallSprite = new Sprite(Assets.get('wall'));
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
                else if (entity.type === 'monster') textureAlias = entity.id;
                else if (entity.type === 'item') textureAlias = entity.id;

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
        this.hud.update(state);
    }

    public async animateItemPickup(state: GameState, onComplete: () => void): Promise<void> {
        if (state.interactionState.type !== 'item_pickup') return;

        const playerKey = Object.keys(state.entities).find(k => state.entities[k].type === 'player_start');
        if (!playerKey) return;

        const playerSprite = this.entitySprites.get(playerKey);
        const itemSprite = this.entitySprites.get(state.interactionState.itemId);

        if (!playerSprite || !itemSprite) {
            onComplete();
            return;
        }

        const item = state.entities[state.interactionState.itemId];
        if(!item) {
            onComplete();
            return;
        }

        const targetX = item.x * TILE_SIZE + TILE_SIZE / 2;
        const targetY = (item.y + 1) * TILE_SIZE;

        const tl = gsap.timeline({ onComplete });
        const duration = 0.3;
        const jumpHeight = TILE_SIZE / 2;

        // 1. Jump up and over to the target X
        tl.to(playerSprite, {
            x: targetX,
            y: playerSprite.y - jumpHeight,
            duration: duration * 0.7,
            ease: 'power1.out',
        });

        // 2. Drop down onto the target Y
        tl.to(playerSprite, {
            y: targetY,
            duration: duration * 0.3,
            ease: 'power1.in',
        });

        // Item fade-out animation runs concurrently
        tl.to(itemSprite, {
            y: targetY - TILE_SIZE,
            alpha: 0,
            duration: duration,
            ease: 'power1.in',
        }, 0);
    }

    public async animateAttack(attackerId: string, defenderId: string, damage: number, onComplete: () => void): Promise<void> {
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

        tl.to(defenderSprite, {
            tint: 0xff0000,
            duration: 0.1,
            yoyo: true,
            repeat: 1,
        }, '-=0.1');

        const damageText = new Text(`-${damage}`, { fontSize: 24, fill: 'red', fontWeight: 'bold' });
        damageText.x = defenderSprite.x;
        damageText.y = defenderSprite.y - TILE_SIZE; // Adjusted for new sprite height
        damageText.anchor.set(0.5);
        this.topLayerContainer.addChild(damageText); // Add to top layer

        tl.to(damageText, {
            y: damageText.y - 40,
            alpha: 0,
            duration: 1,
            ease: 'power1.out',
            onComplete: () => this.topLayerContainer.removeChild(damageText),
        }, '-=0.1');
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
