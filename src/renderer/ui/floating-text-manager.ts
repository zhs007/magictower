import { Container, Text } from 'pixi.js';
import { gsap } from 'gsap';

export type FloatingTextType = 'DAMAGE' | 'HEAL' | 'ITEM_GAIN' | 'STAT_INCREASE';

interface FloatingTextRequest {
    text: string;
    type: FloatingTextType;
    position: { x: number; y: number };
}

export class FloatingTextManager {
    private parent: Container;
    private queue: FloatingTextRequest[] = [];
    private isAnimating: boolean = false;

    constructor(parent: Container) {
        this.parent = parent;
    }

    public add(text: string, type: FloatingTextType, position: { x: number; y: number }): void {
        this.queue.push({ text, type, position });
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
        const style = this.getStyle(request.type);
        const damageText = new Text({
            text: request.text,
            style: style,
        });
        damageText.x = request.position.x;
        damageText.y = request.position.y;
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
                }, 200); // 200ms delay between texts
            },
        });
    }
}
