import { describe, it, expect, vi } from 'vitest';
import { HUD } from './hud';
import { GameState } from '../../core/types';

// Mock PIXI.js classes
vi.mock('pixi.js', async () => {
    const original = await vi.importActual('pixi.js');
    return {
        ...original,
        Container: class {
            constructor() {
                this.x = 0;
                this.y = 0;
            }
            addChild = vi.fn();
            removeChild = vi.fn();
        },
        Text: vi.fn(() => ({
            x: 0,
            y: 0,
            text: '',
            width: 100, // Mock width
            addChild: vi.fn(),
        })),
        Graphics: vi.fn(() => ({
            fill: vi.fn().mockReturnThis(),
            drawRect: vi.fn().mockReturnThis(),
            addChild: vi.fn(),
        })),
        TextStyle: vi.fn(),
    };
});

describe('HUD', () => {
    it('should update all text fields based on game state', () => {
        // 1. Arrange
        const hud = new HUD();
        const mockState: GameState = {
            currentFloor: 5,
            player: {
                hp: 85,
                attack: 15,
                defense: 7,
                keys: { yellow: 2, blue: 1, red: 0 },
                // Other IPlayer properties are not needed for this test
                id: 'player', name: 'tester', x: 0, y: 0, equipment: {}, backupEquipment: [], buffs: []
            },
            // Other GameState properties are not needed for this test
            map: [], entities: {}, monsters: {}, items: {}, equipments: {}, doors: {}
        };

        // 2. Act
        hud.update(mockState);

        // 3. Assert
        expect(hud.floorText.text).toBe('5');
        expect(hud.hpText.text).toBe('85');
        expect(hud.atkText.text).toBe('15');
        expect(hud.defText.text).toBe('7');
        expect(hud.yellowKeyText.text).toBe('2');
        expect(hud.blueKeyText.text).toBe('1');
        expect(hud.redKeyText.text).toBe('0');
    });

    it('should handle missing keys property gracefully', () => {
        // 1. Arrange
        const hud = new HUD();
        const mockState = {
            currentFloor: 1,
            player: {
                hp: 100,
                attack: 10,
                defense: 5,
                // no 'keys' property
            },
        } as GameState; // Cast to bypass TypeScript check for the test

        // 2. Act
        hud.update(mockState);

        // 3. Assert
        expect(hud.yellowKeyText.text).toBe('0');
        expect(hud.blueKeyText.text).toBe('0');
        expect(hud.redKeyText.text).toBe('0');
    });
});
