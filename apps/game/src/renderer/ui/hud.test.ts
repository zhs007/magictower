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

vi.mock('@proj-tower/logic-core', async (importOriginal) => {
    const original = await importOriginal<typeof import('@proj-tower/logic-core')>();
    return {
        ...original,
        dataManager: {
            getLevelData: vi.fn().mockReturnValue([
                { level: 1, exp_needed: 0 },
                { level: 2, exp_needed: 100 },
            ]),
        },
    };
});

describe('HUD', () => {
    let hud: HUD;
    let mockState: GameState;

    beforeEach(() => {
        vi.clearAllMocks();
        hud = new HUD();
        mockState = {
            player: {
                level: 1,
                exp: 25,
                hp: 100,
                maxhp: 100,
                attack: 10,
                defense: 5,
                speed: 10,
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
        expect(eventManager.on).toHaveBeenCalledWith('PLAYER_LEVELED_UP', expect.any(Function));
    });

    it('should update player info on playerUpdate event', () => {
        const payload = {
            entityId: 'player',
            newHp: 80,
            maxHp: 100,
            level: 1,
            exp: 30,
            attack: 10,
            defense: 5,
            speed: 10,
        };
        hud['handlePlayerUpdate'](payload);
        expect((hud as any).playerStatsText.text).toBe('HP 80/100  ATK 10  DEF 5  SPD 10');
        expect((hud as any).levelText.text).toBe('Level: 1');
        expect((hud as any).expText.text).toBe('EXP: 30 / 100');
    });

    it('should update keys on KEYS_CHANGED event', () => {
        hud['handleKeysChange']({ keys: { yellow: 2, blue: 2, red: 3 } });
        expect((hud as any).keysText.text).toBe('钥匙: 黄 2  蓝 2  红 3');
    });

    it('should hide monster stats and update player info on BATTLE_ENDED event', () => {
        const payload = {
            finalPlayerHp: 75,
            finalPlayerMaxHp: 120,
            finalPlayerLevel: 2,
            finalPlayerExp: 115,
            finalPlayerAtk: 12,
            finalPlayerDef: 6,
            finalPlayerSpeed: 11,
        };
        hud['handleBattleEnd'](payload);
        expect((hud as any).monsterStatsText.visible).toBe(false);
        expect((hud as any).playerStatsText.text).toBe('HP 75/120  ATK 12  DEF 6  SPD 11');
    });

    it('should unregister listeners on destroy', () => {
        hud.destroy();
        expect(eventManager.off).toHaveBeenCalledWith('HP_CHANGED', expect.any(Function));
        expect(eventManager.off).toHaveBeenCalledWith('KEYS_CHANGED', expect.any(Function));
        expect(eventManager.off).toHaveBeenCalledWith('BATTLE_ENDED', expect.any(Function));
        expect(eventManager.off).toHaveBeenCalledWith('PLAYER_LEVELED_UP', expect.any(Function));
    });
});
