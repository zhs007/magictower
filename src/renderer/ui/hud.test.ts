import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HUD } from './hud';
import { GameState } from '../../core/types';
import { eventManager } from '../../core/event-manager';

// Mock PIXI.js classes
vi.mock('pixi.js', async () => {
    const original = await vi.importActual('pixi.js');
    const mockText = (config: { text: string }) => ({
        x: 0,
        y: 0,
        text: config.text || '',
        visible: true,
        position: { set: vi.fn() },
    });
    return {
        ...original,
        Container: class {
            addChild = vi.fn();
            removeChild = vi.fn();
            destroy() {} // Make it a real empty function
        },
        Text: vi.fn(mockText),
        Graphics: vi.fn(() => ({
            rect: vi.fn().mockReturnThis(),
            fill: vi.fn().mockReturnThis(),
        })),
    };
});

// Mock EventManager
vi.mock('../../core/event-manager', () => ({
    eventManager: {
        on: vi.fn(),
        off: vi.fn(),
        dispatch: vi.fn(),
    },
}));

describe('HUD', () => {
    let hud: HUD;
    let mockState: GameState;

    beforeEach(() => {
        vi.clearAllMocks();
        hud = new HUD();
        mockState = {
            player: {
                hp: 100,
                attack: 10,
                defense: 5,
                keys: { yellow: 1, blue: 2, red: 3 },
                id: 'p1',
                name: 'player',
                x: 0,
                y: 0,
                equipment: {},
                backupEquipment: [],
                buffs: [],
            },
            monsters: {},
            interactionState: { type: 'none' },
        } as unknown as GameState;
        hud.update(mockState); // Set initial state
    });

    it('should register listeners on creation', () => {
        expect(eventManager.on).toHaveBeenCalledWith('HP_CHANGED', expect.any(Function));
        expect(eventManager.on).toHaveBeenCalledWith('KEYS_CHANGED', expect.any(Function));
        expect(eventManager.on).toHaveBeenCalledWith('BATTLE_ENDED', expect.any(Function));
    });

    it('should update HP on HP_CHANGED event', () => {
        hud['handleHpChange']({ entityId: 'player', newHp: 80, attack: 10, defense: 5 });
        expect((hud as any).playerStatsText.text).toBe('勇者: HP 80  ATK 10  DEF 5');
    });

    it('should update keys on KEYS_CHANGED event', () => {
        hud['handleKeysChange']({ keys: { yellow: 2, blue: 2, red: 3 } });
        expect((hud as any).keysText.text).toBe('钥匙: 黄 2  蓝 2  红 3');
    });

    it('should hide monster stats and update player HP on BATTLE_ENDED event', () => {
        hud['handleBattleEnd']({ finalPlayerHp: 75, finalPlayerAtk: 10, finalPlayerDef: 5 });
        expect((hud as any).monsterStatsText.visible).toBe(false);
        expect((hud as any).playerStatsText.text).toBe('勇者: HP 75  ATK 10  DEF 5');
    });

    it('should unregister listeners on destroy', () => {
        hud.destroy();
        expect(eventManager.off).toHaveBeenCalledWith('HP_CHANGED', expect.any(Function));
        expect(eventManager.off).toHaveBeenCalledWith('KEYS_CHANGED', expect.any(Function));
        expect(eventManager.off).toHaveBeenCalledWith('BATTLE_ENDED', expect.any(Function));
    });
});
