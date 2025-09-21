import { describe, it, expect, vi } from 'vitest';
import { Entity } from '../entity';

describe('Entity', () => {
    it('should create an entity with default action', () => {
        const entity = new Entity();
        expect(entity.action).toBe('idle');
    });

    it('should set and call an action', () => {
        const entity = new Entity();
        const callback = vi.fn();

        entity.setAction('test_action', callback);
        entity.action = 'test_action';
        entity.update(16);

        expect(callback).toHaveBeenCalledWith(16);
    });

    it('should not call a callback if the action is not set', () => {
        const entity = new Entity();
        const callback = vi.fn();

        entity.setAction('test_action', callback);
        // entity.action is 'idle' by default
        entity.update(16);

        expect(callback).not.toHaveBeenCalled();
    });
});
