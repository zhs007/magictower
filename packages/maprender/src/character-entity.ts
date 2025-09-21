import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import { Entity } from './entity';

export type Direction = 'left' | 'right';

const TILE_SIZE = 65;

export class CharacterEntity extends Entity {
    public direction: Direction;
    public sprite: PIXI.Sprite;

    constructor(texture: PIXI.Texture) {
        super();
        this.direction = 'right'; // Default direction as per jules.md
        this.sprite = new PIXI.Sprite(texture);
        this.sprite.anchor.set(0.5, 1); // All assets are bottom-center aligned
        this.addChild(this.sprite);
    }

    public setDirection(direction: Direction): void {
        if (this.direction !== direction) {
            this.direction = direction;
            this.sprite.scale.x = direction === 'left' ? -1 : 1;
        }
    }

    public attack(
        defender: CharacterEntity,
        damage: number,
        showDamage: (damage: number) => void,
        onComplete: () => void
    ): void {
        const originalX = this.x;
        const originalY = this.y;
        const targetX = defender.x;
        const targetY = defender.y;

        const tl = gsap.timeline({ onComplete });

        tl.to(this, {
            x: (originalX + targetX) / 2,
            y: (originalY + targetY) / 2,
            duration: 0.15,
            ease: 'power1.in',
            yoyo: true,
            repeat: 1,
        });

        tl.to(
            defender.sprite,
            {
                tint: 0xff0000,
                duration: 0.1,
                yoyo: true,
                repeat: 1,
                onStart: () => showDamage(damage),
            },
            '-=0.1'
        );
    }

    public pickup(item: Entity, onComplete: () => void): void {
        const targetX = item.x;
        const targetY = item.y;

        const tl = gsap.timeline({ onComplete });
        const duration = 0.3;

        // This is a simplification of the original logic.
        // The original logic had different jump heights based on relative positions,
        // which is complex to replicate without the full game state.
        // This implementation provides a good-enough generic jump.
        const jumpHeight = TILE_SIZE / 2;
        const peakY = this.y - jumpHeight;

        tl.to(this, { x: targetX, duration: duration, ease: 'linear' }, 0);
        tl.to(this, { y: peakY, duration: duration / 2, ease: 'power1.out' }, 0).to(this, {
            y: targetY,
            duration: duration / 2,
            ease: 'power1.in',
        });

        tl.to(
            item,
            {
                y: targetY - TILE_SIZE,
                alpha: 0,
                duration: duration,
                ease: 'power1.in',
            },
            0
        );
    }
}
