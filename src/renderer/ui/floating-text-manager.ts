import { Container, Sprite, Text } from 'pixi.js';
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
        switch (type) {
            case 'DAMAGE':
                return { fontSize: 24, fill: 'red', fontWeight: 'bold' };
            case 'HEAL':
                return { fontSize: 24, fill: 'green', fontWeight: 'bold' };
            case 'ITEM_GAIN':
                return { fontSize: 22, fill: 'yellow', fontWeight: 'bold' };
            case 'STAT_INCREASE':
                return { fontSize: 22, fill: 'orange', fontWeight: 'bold' };
            default:
                return { fontSize: 20, fill: 'white', fontWeight: 'normal' };
        }
    }

    private createAndAnimateText(request: FloatingTextRequest): void {
        console.log(`[FloatingTextManager] Processing request for entityId: ${request.entityId}`);
        console.log(`[FloatingTextManager] Available sprite keys:`, Array.from(this.entitySprites.keys()));
        const sprite = this.entitySprites.get(request.entityId);

        if (!sprite) {
            console.error(`[FloatingTextManager] Sprite not found for entityId: ${request.entityId}. Skipping text animation.`);
            // If sprite is not found (e.g., entity was removed), skip this request
            this.processQueue();
            return;
        }

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
                // Wait a bit before processing the next item in the queue
                setTimeout(() => {
                    this.processQueue();
                }, 100); // 100ms delay between texts
            },
        });
    }
}
