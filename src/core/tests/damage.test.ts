import { describe, it, expect } from 'vitest';
import { calculateDamage } from '../logic';
import { ICharacter } from '../types';

describe('calculateDamage', () => {
    const mockPlayer: ICharacter = {
        id: 'player',
        name: 'Player',
        hp: 100,
        attack: 10,
        defense: 5,
        x: 0,
        y: 0,
        speed: 5,
        direction: 'right',
        equipment: {},
        backupEquipment: [],
        buffs: [],
    };

    const mockMonster: ICharacter = {
        id: 'monster',
        name: 'Monster',
        hp: 50,
        attack: 8,
        defense: 2,
        x: 1,
        y: 1,
        speed: 3,
        direction: 'left',
        equipment: {},
        backupEquipment: [],
        buffs: [],
    };

    it('should calculate positive damage correctly', () => {
        // Player attacks monster: 10 ATK vs 2 DEF = 8 DMG
        const damage = calculateDamage(mockPlayer, mockMonster);
        expect(damage).toBe(8);
    });

    it('should deal a minimum of 1 damage when attack is less than defense', () => {
        const weakAttacker = { ...mockPlayer, attack: 4 };
        const strongDefender = { ...mockMonster, defense: 10 };
        // Attacker (4 ATK) vs Defender (10 DEF) = -6 DMG, should be 1
        const damage = calculateDamage(weakAttacker, strongDefender);
        expect(damage).toBe(1);
    });

    it('should deal a minimum of 1 damage when attack is equal to defense', () => {
        const equalAttacker = { ...mockPlayer, attack: 10 };
        const equalDefender = { ...mockMonster, defense: 10 };
        // Attacker (10 ATK) vs Defender (10 DEF) = 0 DMG, should be 1
        const damage = calculateDamage(equalAttacker, equalDefender);
        expect(damage).toBe(1);
    });
});
