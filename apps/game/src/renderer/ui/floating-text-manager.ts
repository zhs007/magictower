import { Container, Sprite, Text, TextStyleFontWeight } from 'pixi.js';
import { gsap } from 'gsap';

export type FloatingTextType = 'DAMAGE' | 'HEAL' | 'ITEM_GAIN' | 'STAT_INCREASE';

const TILE_SIZE = 65; // This should be consistent with renderer's TILE_SIZE

interface FloatingTextRequest {
    text: string;
    type: FloatingTextType;
    entityId: string;
}

export class FloatingTextManager {
    private parent: Container;
    private entitySprites: Map<string, Sprite>;
    private queue: FloatingTextRequest[] = [];
    private isAnimating: boolean = false;

    constructor(parent: Container, entitySprites: Map<string, Sprite>) {
        this.parent = parent;
        this.entitySprites = entitySprites;
    }

    public add(text: string, type: FloatingTextType, entityId: string): void {
        this.queue.push({ text, type, entityId });
        if (!this.isAnimating) {
            this.processQueue();
        }
    }

    private processQueue(): void {
        if (this.queue.length === 0) {
            this.isAnimating = false;
            return;
        }

        this.isAnimating = true;
        const request = this.queue.shift()!;
        this.createAndAnimateText(request);
    }

    private getStyle(type: FloatingTextType) {
        const fontWeight: TextStyleFontWeight = 'bold';
        const normalWeight: TextStyleFontWeight = 'normal';

        switch (type) {
            case 'DAMAGE':
                return { fontSize: 24, fill: 'red', fontWeight };
            case 'HEAL':
                return { fontSize: 24, fill: 'green', fontWeight };
            case 'ITEM_GAIN':
                return { fontSize: 22, fill: 'yellow', fontWeight };
            case 'STAT_INCREASE':
                return { fontSize: 22, fill: 'orange', fontWeight };
            default:
                return { fontSize: 20, fill: 'white', fontWeight: normalWeight };
        }
    }

    private createAndAnimateText(request: FloatingTextRequest): void {
        const sprite = this.entitySprites.get(request.entityId);

        if (!sprite) {
            // If sprite is not found, we must still process the rest of the queue.
            this.processQueue();
            return;
        }

        // Trigger the next item in the queue after the desired delay.
        // This makes the queue processing independent of the animation duration.
        setTimeout(() => {
            this.processQueue();
        }, 200);

        const style = this.getStyle(request.type);
        const damageText = new Text({
            text: request.text,
            style: style,
        });
        damageText.x = sprite.x;
        damageText.y = sprite.y - TILE_SIZE; // Spawn above the sprite
        damageText.anchor.set(0.5);
        this.parent.addChild(damageText);

        gsap.to(damageText, {
            y: damageText.y - 60, // Animate upwards
            alpha: 0,
            duration: 1.5,
            ease: 'power1.out',
            onComplete: () => {
                this.parent.removeChild(damageText);
            },
        });
    }
}
