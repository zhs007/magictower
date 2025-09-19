import { Container, Assets, Sprite } from 'pixi.js';
import { GameState, dataManager } from '@proj-tower/logic-core';
import { MapRender, Entity, CharacterEntity } from '@proj-tower/maprender';
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

    private entities: Map<string, Entity> = new Map();

    constructor(stage: Container) {
        this.stage = stage;
        this.topLayerContainer = new Container();
        this.hud = new HUD();
        this.floatingTextManager = new FloatingTextManager(this.topLayerContainer, this.entities);

        this.topLayerContainer.sortableChildren = true;

        this.worldContainer = new Container();
        this.worldContainer.x = MAP_OFFSET_X;
        this.worldContainer.y = 200;

        this.worldContainer.addChild(this.topLayerContainer);

        this.hud.y = MAP_WIDTH_TILES * TILE_SIZE + this.worldContainer.y;

        this.stage.addChild(this.worldContainer, this.hud);
    }

    public getEntity(id: string): Entity | undefined {
        return this.entities.get(id);
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
        if (this.mapRender) {
            this.worldContainer.removeChild(this.mapRender);
            this.mapRender.destroy();
        }

        this.mapRender = new MapRender(state);
        this.worldContainer.addChildAt(this.mapRender, 0);

        this.syncEntities(state);
        this.hud.update(state);
    }

    public syncEntities(state: GameState): void {
        if (!this.mapRender) return;

        const allEntityIds = new Set(Object.keys(state.entities));

        for (const [entityId, entity] of this.entities.entries()) {
            if (!allEntityIds.has(entityId)) {
                entity.visible = false;
            }
        }

        for (const entityId of allEntityIds) {
            const entityData = state.entities[entityId];
            if (!entityData) continue;

            let entity = this.entities.get(entityId);

            if (!entity) {
                let textureAlias = '';
                if (entityData.type === 'player_start') {
                    textureAlias = 'player';
                } else if (entityData.type === 'stair') {
                    textureAlias = 'item_item';
                } else if (
                    entityData.type === 'monster' ||
                    entityData.type === 'item' ||
                    entityData.type === 'equipment'
                ) {
                    textureAlias = (entityData as any).assetId ?? entityData.id;
                }

                if (textureAlias) {
                    const texture = Assets.get(textureAlias);
                    if (entityData.type === 'player_start' || entityData.type === 'monster') {
                        entity = new CharacterEntity(texture);
                    } else {
                        entity = new Entity();
                        const sprite = new Sprite(texture);
                        sprite.anchor.set(0.5, 1);
                        if (entityData.type === 'stair') {
                            sprite.tint = 0x800080;
                        }
                        entity.addChild(sprite);
                    }

                    this.entities.set(entityId, entity);
                    this.mapRender.addEntity(entity);
                }
            }

            if (entity) {
                entity.x = entityData.x * TILE_SIZE + TILE_SIZE / 2;
                entity.y = (entityData.y + 1) * TILE_SIZE;
                entity.zIndex = entityData.y;
                entity.visible = true;

                if (entity instanceof CharacterEntity && 'direction' in entityData) {
                    entity.setDirection((entityData as any).direction);
                }
            }
        }
    }

    public render(state: GameState): void {
        this.syncEntities(state);
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
        const entity = this.entities.get(entityId);
        if (entity) {
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
