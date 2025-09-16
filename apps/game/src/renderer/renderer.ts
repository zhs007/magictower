import { Container, Assets, Sprite } from 'pixi.js';
import { GameState, dataManager } from '@proj-tower/logic-core';
import { MapRender } from '@proj-tower/maprender';
import { HUD } from './ui/hud';
import { gsap } from 'gsap';
import { FloatingTextManager } from './ui/floating-text-manager';

const TILE_SIZE = 65;
const MAP_WIDTH_TILES = 16;
const MAP_OFFSET_X = 20;

export class Renderer {
    private stage: Container;
    private topLayerContainer: Container;
    private hud: HUD;
    public floatingTextManager: FloatingTextManager;
    private mapRender?: MapRender;
    private worldContainer: Container;

    private entitySprites: Map<string, Sprite> = new Map();

    constructor(stage: Container) {
        this.stage = stage;
        this.topLayerContainer = new Container();
        this.hud = new HUD();
        this.floatingTextManager = new FloatingTextManager(
            this.topLayerContainer,
            this.entitySprites
        );

        this.topLayerContainer.sortableChildren = true;

        this.worldContainer = new Container();
        this.worldContainer.x = MAP_OFFSET_X;
        this.worldContainer.y = 200;

        // The mapRender instance will be added to worldContainer in initialize()
        this.worldContainer.addChild(this.topLayerContainer);

        this.hud.y = MAP_WIDTH_TILES * TILE_SIZE + this.worldContainer.y;

        this.stage.addChild(this.worldContainer, this.hud);
    }

    public async processAssetModules(modules: Record<string, string>): Promise<void> {
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

    public async loadAssets(): Promise<void> {
        await dataManager.loadAllData();

        const modules = import.meta.glob('../../../../assets/**/*.{png,jpg,jpeg,webp}', {
            eager: true,
            query: '?url',
            import: 'default',
        }) as Record<string, string>;

        await this.processAssetModules(modules);
    }

    public initialize(state: GameState): void {
        // If a map already exists, remove it.
        if (this.mapRender) {
            this.worldContainer.removeChild(this.mapRender);
            this.mapRender.destroy();
        }

        this.mapRender = new MapRender(state);
        this.worldContainer.addChildAt(this.mapRender, 0); // Add map behind top layer

        this.syncSprites(state);
        this.hud.update(state);
    }

    public syncSprites(state: GameState): void {
        if (!this.mapRender) return;

        const allEntityIds = new Set(Object.keys(state.entities));

        // Hide or remove sprites for entities that no longer exist
        for (const [entityId, sprite] of this.entitySprites.entries()) {
            if (!allEntityIds.has(entityId)) {
                sprite.visible = false;
                // this.mapRender.entityContainer.removeChild(sprite);
                // this.entitySprites.delete(entityId);
            }
        }

        for (const entityId of allEntityIds) {
            const entity = state.entities[entityId];
            if (!entity) continue;

            let sprite = this.entitySprites.get(entityId);

            if (!sprite) {
                let textureAlias = '';
                if (entity.type === 'player_start') {
                    textureAlias = 'player';
                } else if (entity.type === 'stair') {
                    textureAlias = 'item_item';
                } else if (
                    entity.type === 'monster' ||
                    entity.type === 'item' ||
                    entity.type === 'equipment'
                ) {
                    textureAlias = (entity as any).assetId ?? entity.id;
                }

                if (textureAlias) {
                    sprite = new Sprite(Assets.get(textureAlias));
                    sprite.anchor.set(0.5, 1);

                    if (entity.type === 'stair') {
                        sprite.tint = 0x800080;
                    }

                    this.entitySprites.set(entityId, sprite);
                    this.mapRender.entityContainer.addChild(sprite);
                }
            }

            if (sprite) {
                sprite.x = entity.x * TILE_SIZE + TILE_SIZE / 2;
                sprite.y = (entity.y + 1) * TILE_SIZE;
                sprite.zIndex = entity.y;
                sprite.visible = true;

                if ('direction' in entity) {
                    sprite.scale.x = entity.direction === 'left' ? -1 : 1;
                    sprite.scale.y = 1;
                }
            }
        }
    }

    public render(state: GameState): void {
        this.syncSprites(state);
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
            let jumpHeight;
            let peakY;
            if (player.y > item.y) {
                jumpHeight = TILE_SIZE / 4;
                peakY = targetY - jumpHeight;
            } else {
                jumpHeight = TILE_SIZE / 4;
                peakY = playerSprite.y - jumpHeight;
            }
            tl.to(playerSprite, { y: peakY, duration: duration / 2, ease: 'power1.out' }).to(
                playerSprite,
                { y: targetY, duration: duration / 2, ease: 'power1.in' }
            );
        } else {
            const jumpHeight = TILE_SIZE / 2;
            const peakY = playerSprite.y - jumpHeight;
            tl.to(playerSprite, { x: targetX, duration: duration, ease: 'linear' }, 0);
            tl.to(playerSprite, { y: peakY, duration: duration / 2, ease: 'power1.out' }, 0).to(
                playerSprite,
                { y: targetY, duration: duration / 2, ease: 'power1.in' }
            );
        }

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

        this.floatingTextManager.add(`-${damage}`, 'DAMAGE', defenderId);
    }

    public animateFloorTransition(onComplete: () => void): void {
        const tl = gsap.timeline();
        tl.to(this.stage, {
            alpha: 0,
            duration: 0.5,
            ease: 'power1.in',
            onComplete: () => {
                onComplete();
                gsap.to(this.stage, {
                    alpha: 1,
                    duration: 0.5,
                    ease: 'power1.out',
                });
            },
        });
    }

    public showFloatingTextOnEntity(
        text: string,
        type: 'ITEM_GAIN' | 'STAT_INCREASE' | 'HEAL',
        entityId: string
    ): void {
        const sprite = this.entitySprites.get(entityId);
        if (sprite) {
            this.floatingTextManager.add(text, type, entityId);
        }
    }

    public moveToTopLayer(sprite: Sprite): void {
        if (!this.mapRender) return;
        if (sprite.parent === this.mapRender.entityContainer) {
            this.mapRender.entityContainer.removeChild(sprite);
            this.topLayerContainer.addChild(sprite);
        }
    }

    public moveToMainLayer(sprite: Sprite): void {
        if (!this.mapRender) return;
        if (sprite.parent === this.topLayerContainer) {
            this.topLayerContainer.removeChild(sprite);
            this.mapRender.entityContainer.addChild(sprite);
        }
    }
}
