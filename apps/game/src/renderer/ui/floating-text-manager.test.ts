import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FloatingTextManager, FloatingTextType } from './floating-text-manager';
import { Container } from 'pixi.js';

// Mock Pixi.js and gsap
vi.mock('pixi.js', async () => {
    const actual = await vi.importActual('pixi.js');
    return {
        ...actual,
        Container: vi.fn().mockImplementation(() => ({
            addChild: vi.fn(),
            removeChild: vi.fn(),
        })),
        Text: vi.fn().mockImplementation(() => ({
            anchor: { set: vi.fn() },
        })),
    };
});

vi.mock('gsap', () => ({
    gsap: {
        to: vi.fn((target, vars) => {
            // Immediately call onComplete for testing purposes
            if (vars.onComplete) {
                vars.onComplete();
            }
        }),
    },
}));

describe('FloatingTextManager', () => {
    let manager: FloatingTextManager;
    let parent: Container;
    let entitySprites: Map<string, any>;

    beforeEach(() => {
        parent = new Container();
        entitySprites = new Map();
        // Add a mock sprite for tests to use
        entitySprites.set('test_entity', { x: 100, y: 100 });
        manager = new FloatingTextManager(parent, entitySprites as any);
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('should add a request to the queue', () => {
        // Prevent processQueue from running so we can inspect the queue state
        vi.spyOn(manager as any, 'processQueue').mockImplementation(() => {});
        manager.add('test', 'DAMAGE', 'test_entity');
        expect((manager as any).queue.length).toBe(1);
    });

    it('should process the queue immediately if not animating', () => {
        const processSpy = vi.spyOn(manager as any, 'processQueue');
        manager.add('test', 'DAMAGE', 'test_entity');
        expect(processSpy).toHaveBeenCalled();
    });

    it('should process requests sequentially', () => {
        const createSpy = vi.spyOn(manager as any, 'createAndAnimateText');

        manager.add('test1', 'DAMAGE', 'test_entity');
        manager.add('test2', 'DAMAGE', 'test_entity');

        expect(createSpy).toHaveBeenCalledTimes(1);
        expect((manager as any).queue.length).toBe(1);

        // Advance timers to trigger the setTimeout in onComplete
        vi.runAllTimers();

        expect(createSpy).toHaveBeenCalledTimes(2);
        expect((manager as any).queue.length).toBe(0);
    });
});
