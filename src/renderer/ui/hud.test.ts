import { describe, it, expect, vi } from 'vitest';
import { HUD } from './hud';
import { GameState } from '../../core/types';

// Mock PIXI.js classes
vi.mock('pixi.js', async () => {
    const original = await vi.importActual('pixi.js');
    const mockText = () => ({
        x: 0, y: 0, text: '', visible: true,
        position: { set: vi.fn() },
    });
    return {
        ...original,
        Container: class {
            addChild = vi.fn();
        },
        Text: vi.fn(mockText),
        Graphics: vi.fn(() => ({
            rect: vi.fn().mockReturnThis(),
            fill: vi.fn().mockReturnThis(),
        })),
    };
});

describe('HUD', () => {
    it('should display player stats and hide monster stats when not in battle', () => {
        const hud = new HUD();
        const mockState: GameState = {
            player: {
                hp: 100, attack: 10, defense: 5,
                keys: { yellow: 1, blue: 2, red: 3 },
                id: 'p1', name: 'player', x: 0, y: 0, equipment: {}, backupEquipment: [], buffs: []
            },
            interactionState: { type: 'none' },
        } as GameState;

        hud.update(mockState);

        expect(hud.playerStatsText.text).toBe('勇者: HP 100  ATK 10  DEF 5');
        expect(hud.keysText.text).toBe('钥匙: 黄 1  蓝 2  红 3');
        expect(hud.monsterStatsText.visible).toBe(false);
    });

    it('should display all stats including monster stats during battle', () => {
        const hud = new HUD();
        const mockState: GameState = {
            player: {
                hp: 100, attack: 10, defense: 5,
                keys: { yellow: 1, blue: 2, red: 3 },
                id: 'p1', name: 'player', x: 0, y: 0, equipment: {}, backupEquipment: [], buffs: []
            },
            monsters: {
                'm1': {
                    id: 'm1', name: 'Slime', hp: 50, attack: 8, defense: 2,
                    x: 1, y: 1, equipment: {}, backupEquipment: [], buffs: []
                }
            },
            interactionState: {
                type: 'battle',
                monsterId: 'm1',
                playerHp: 88,
                monsterHp: 42,
                round: 2,
                turn: 'player'
            },
        } as GameState;

        hud.update(mockState);

        expect(hud.playerStatsText.text).toBe('勇者: HP 88  ATK 10  DEF 5');
        expect(hud.keysText.text).toBe('钥匙: 黄 1  蓝 2  红 3');
        expect(hud.monsterStatsText.visible).toBe(true);
        expect(hud.monsterStatsText.text).toBe('Slime: HP 42  ATK 8  DEF 2');
    });
});
