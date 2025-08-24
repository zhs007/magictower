import { IPlayer, IMonster, IEquipment, EquipmentSlot, WeaponType } from '../types';
import { calculateFinalStats } from '../stat-calculator';
import { handleStartBattle } from '../logic';
import { compareEquipment } from '../equipment-manager';
import { GameState } from '../types';
import * as _ from 'lodash';

// Helper to create a mock player
const createMockPlayer = (stats: Partial<IPlayer> = {}): IPlayer => ({
    id: 'player',
    name: 'Hero',
    level: 1,
    exp: 0,
    hp: 100,
    maxhp: 100,
    attack: 10,
    defense: 10,
    speed: 10,
    x: 0,
    y: 0,
    direction: 'right',
    equipment: {},
    backupEquipment: [],
    buffs: [],
    keys: { yellow: 0, blue: 0, red: 0 },
    ...stats,
});

// Helper to create mock equipment
const createMockEquipment = (id: string, stats: Partial<IEquipment>): IEquipment => ({
    id,
    name: id,
    slot: EquipmentSlot.BODY,
    ...stats,
});

describe('Plan 015: Speed and Equipment Overhaul', () => {
    describe('Stat Calculation (calculateFinalStats)', () => {
        it('should return base stats when no equipment is worn', () => {
            const player = createMockPlayer();
            const finalStats = calculateFinalStats(player);
            expect(finalStats.attack).toBe(10);
            expect(finalStats.defense).toBe(10);
            expect(finalStats.speed).toBe(10);
        });

        it('should apply flat stat bonuses correctly', () => {
            const player = createMockPlayer();
            player.equipment[EquipmentSlot.RIGHT_HAND] = createMockEquipment('broadsword', {
                slot: EquipmentSlot.RIGHT_HAND,
                stat_mods: { attack: 15, speed: -5 },
            });
            const finalStats = calculateFinalStats(player);
            expect(finalStats.attack).toBe(25); // 10 + 15
            expect(finalStats.speed).toBe(5); // 10 - 5
        });

        it('should apply percentage stat bonuses correctly', () => {
            const player = createMockPlayer({ attack: 20 }); // Base attack of 20
            player.equipment[EquipmentSlot.FEET] = createMockEquipment('swift_boots', {
                slot: EquipmentSlot.FEET,
                percent_mods: { attack: 0.1 },
            }); // +10% attack
            const finalStats = calculateFinalStats(player);
            expect(finalStats.attack).toBe(22); // 20 + (20 * 0.1)
        });

        it('should combine flat and percentage bonuses', () => {
            const player = createMockPlayer({ attack: 20 });
            player.equipment[EquipmentSlot.RIGHT_HAND] = createMockEquipment('magic_sword', {
                slot: EquipmentSlot.RIGHT_HAND,
                stat_mods: { attack: 10 },
            });
            player.equipment[EquipmentSlot.FEET] = createMockEquipment('swift_boots', {
                slot: EquipmentSlot.FEET,
                percent_mods: { attack: 0.1 },
            });
            const finalStats = calculateFinalStats(player);
            expect(finalStats.attack).toBe(32); // 20 + 10 + (20 * 0.1)
        });

        it('should enforce the minimum stat value of 1', () => {
            const player = createMockPlayer({ defense: 5 });
            player.equipment[EquipmentSlot.BODY] = createMockEquipment('cursed_armor', {
                stat_mods: { defense: -10 },
            });
            const finalStats = calculateFinalStats(player);
            expect(finalStats.defense).toBe(1); // 5 - 10 = -5, clamped to 1
        });
    });

    describe('Combat Turn Order (handleStartBattle)', () => {
        const createMockState = (player: IPlayer, monster: IMonster): GameState => {
            const monsterKey = 'm1';
            return {
                player,
                monsters: { [monsterKey]: monster },
                entities: { player: player, [monsterKey]: monster },
            } as any;
        };

        it('should give player the first turn if they are faster', () => {
            const player = createMockPlayer({ speed: 20 });
            const monster: IMonster = {
                id: 'm1',
                name: 'm',
                level: 1,
                hp: 1,
                maxhp: 1,
                attack: 1,
                defense: 1,
                speed: 10,
                x: 1,
                y: 1,
                direction: 'left',
                equipment: {},
                backupEquipment: [],
                buffs: [],
            };
            const state = createMockState(player, monster);
            const newState = handleStartBattle(state, 'm1');
            expect(newState.interactionState.type).toBe('battle');
            if (newState.interactionState.type === 'battle') {
                expect(newState.interactionState.turn).toBe('player');
            }
        });

        it('should give monster the first turn if they are faster', () => {
            const player = createMockPlayer({ speed: 5 });
            const monster: IMonster = {
                id: 'm1',
                name: 'm',
                level: 1,
                hp: 1,
                maxhp: 1,
                attack: 1,
                defense: 1,
                speed: 15,
                x: 1,
                y: 1,
                direction: 'left',
                equipment: {},
                backupEquipment: [],
                buffs: [],
            };
            const state = createMockState(player, monster);
            const newState = handleStartBattle(state, 'm1');
            expect(newState.interactionState.type).toBe('battle');
            if (newState.interactionState.type === 'battle') {
                expect(newState.interactionState.turn).toBe('monster');
            }
        });

        it('should give player the first turn in a speed tie', () => {
            const player = createMockPlayer({ speed: 10 });
            const monster: IMonster = {
                id: 'm1',
                name: 'm',
                level: 1,
                hp: 1,
                maxhp: 1,
                attack: 1,
                defense: 1,
                speed: 10,
                x: 1,
                y: 1,
                direction: 'left',
                equipment: {},
                backupEquipment: [],
                buffs: [],
            };
            const state = createMockState(player, monster);
            const newState = handleStartBattle(state, 'm1');
            expect(newState.interactionState.type).toBe('battle');
            if (newState.interactionState.type === 'battle') {
                expect(newState.interactionState.turn).toBe('player');
            }
        });
    });

    describe('Equipment Swapping Logic (compareEquipment)', () => {
        it('should AUTO_EQUIP on an empty slot', () => {
            const player = createMockPlayer();
            const newItem = createMockEquipment('new_armor', { stat_mods: { defense: 5 } });
            const result = compareEquipment(player, newItem);
            expect(result.type).toBe('AUTO_EQUIP');
        });

        it('should AUTO_EQUIP on a pure upgrade', () => {
            const player = createMockPlayer();
            player.equipment[EquipmentSlot.BODY] = createMockEquipment('old_armor', {
                stat_mods: { defense: 5 },
            });
            const newItem = createMockEquipment('new_armor', {
                stat_mods: { defense: 10, speed: 1 },
            });
            const result = compareEquipment(player, newItem);
            expect(result.type).toBe('AUTO_EQUIP');
            if (result.type === 'AUTO_EQUIP') {
                const oldItem = result.oldItem as IEquipment;
                expect(oldItem).toBeDefined();
                expect(oldItem.id).toBe('old_armor');
            }
        });

        it('should AUTO_DISCARD on a pure downgrade', () => {
            const player = createMockPlayer();
            player.equipment[EquipmentSlot.BODY] = createMockEquipment('old_armor', {
                stat_mods: { defense: 10 },
            });
            const newItem = createMockEquipment('new_armor', {
                stat_mods: { defense: 5, speed: -1 },
            });
            const result = compareEquipment(player, newItem);
            expect(result.type).toBe('AUTO_DISCARD');
        });

        it('should PROMPT_SWAP on mixed stat changes', () => {
            const player = createMockPlayer();
            player.equipment[EquipmentSlot.BODY] = createMockEquipment('old_armor', {
                stat_mods: { defense: 10 },
            });
            const newItem = createMockEquipment('new_armor', {
                stat_mods: { defense: -5, speed: 20 },
            });
            const result = compareEquipment(player, newItem);
            expect(result.type).toBe('PROMPT_SWAP');
            if (result.type === 'PROMPT_SWAP') {
                expect(result.statChanges.defense).toBe(-15); // Corrected expectation
                expect(result.statChanges.speed).toBe(20);
            }
        });

        it('should PROMPT_SWAP when going from 1H to 2H weapon', () => {
            const player = createMockPlayer();
            player.equipment[EquipmentSlot.RIGHT_HAND] = createMockEquipment('sword', {
                weaponType: WeaponType.ONE_HANDED,
                slot: EquipmentSlot.RIGHT_HAND,
            });
            const twoHandedAxe = createMockEquipment('greataxe', {
                weaponType: WeaponType.TWO_HANDED,
                slot: [EquipmentSlot.LEFT_HAND, EquipmentSlot.RIGHT_HAND],
            });
            const result = compareEquipment(player, twoHandedAxe);
            expect(result.type).toBe('PROMPT_SWAP');
        });

        it('should PROMPT_SWAP when going from 2H to 1H weapon', () => {
            const player = createMockPlayer();
            const twoHandedAxe = createMockEquipment('greataxe', {
                weaponType: WeaponType.TWO_HANDED,
                slot: [EquipmentSlot.LEFT_HAND, EquipmentSlot.RIGHT_HAND],
            });
            player.equipment[EquipmentSlot.LEFT_HAND] = twoHandedAxe;
            player.equipment[EquipmentSlot.RIGHT_HAND] = twoHandedAxe;
            const newSword = createMockEquipment('new_sword', {
                weaponType: WeaponType.ONE_HANDED,
                slot: EquipmentSlot.RIGHT_HAND,
            });
            const result = compareEquipment(player, newSword);
            expect(result.type).toBe('PROMPT_SWAP');
        });
    });
});
