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
    private mapContainer: Container;
    private entityContainer: Container;
    private hud: HUD;

    private entitySprites: Map<string, Sprite> = new Map();

    constructor(stage: Container) {
        this.stage = stage;
        this.mapContainer = new Container();
        this.entityContainer = new Container();
        this.hud = new HUD();

        this.mapContainer.x = MAP_OFFSET_X;
        this.mapContainer.y = 200;

        this.entityContainer.x = this.mapContainer.x;
        this.entityContainer.y = this.mapContainer.y;

        this.hud.y = (MAP_WIDTH_TILES * TILE_SIZE) + this.mapContainer.y;

        this.stage.addChild(this.mapContainer, this.entityContainer, this.hud);
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

    private drawMap(state: GameState): void {
        this.mapContainer.removeChildren();
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
    }

    public syncSprites(state: GameState): void {
        const allEntityIds = Object.keys(state.entities);

        for (const entityId of allEntityIds) {
            const entity = state.entities[entityId];
            if (!entity) continue;

            let sprite = this.entitySprites.get(entityId);
            if (!sprite) {
                let textureAlias = '';
                if (entity.type === 'player_start') textureAlias = 'player';
                else if (entity.type === 'monster') textureAlias = entity.id;
                else if (entity.type === 'item') textureAlias = entity.id;

                if (textureAlias) {
                    sprite = new Sprite(Assets.get(textureAlias));
                    sprite.width = TILE_SIZE;
                    sprite.height = TILE_SIZE;
                    sprite.anchor.set(0.5);
                    this.entitySprites.set(entityId, sprite);
                    this.entityContainer.addChild(sprite);
                }
            }

            if (sprite) {
                sprite.x = entity.x * TILE_SIZE + TILE_SIZE / 2;
                sprite.y = entity.y * TILE_SIZE + TILE_SIZE / 2;
                sprite.visible = true;
            }
        }

        for (const [entityId, sprite] of this.entitySprites.entries()) {
            if (!state.entities[entityId]) {
                sprite.visible = false;
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
        const targetY = item.y * TILE_SIZE + TILE_SIZE / 2;

        const tl = gsap.timeline({ onComplete });

        tl.to(playerSprite, {
            x: targetX,
            y: targetY,
            duration: 0.3,
            ease: 'power1.inOut',
        });

        tl.to(itemSprite, {
            y: targetY - TILE_SIZE,
            alpha: 0,
            width: itemSprite.width * 0.5,
            height: itemSprite.height * 0.5,
            duration: 0.5,
            ease: 'power1.in',
        }, '-=0.2');
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

        const damageText = new Text(`-${damage}`, { fontSize: 24, fill: 'red', fontWeight: 'bold' });
        damageText.x = defenderSprite.x;
        damageText.y = defenderSprite.y - TILE_SIZE / 2;
        damageText.anchor.set(0.5);
        this.entityContainer.addChild(damageText);

        tl.to(damageText, {
            y: damageText.y - 40,
            alpha: 0,
            duration: 1,
            ease: 'power1.out',
            onComplete: () => this.entityContainer.removeChild(damageText),
        }, '-=0.1');
    }
}
