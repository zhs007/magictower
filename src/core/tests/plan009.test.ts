import { GameState, IPlayer, IMonster, IItem, IDoor } from '../types';
import { handlePickupItem, handleUseBomb, handleEndBattle } from '../logic';
import * as _ from 'lodash';

describe('plan009 features', () => {
    let baseState: GameState;

    beforeEach(() => {
        baseState = {
            currentFloor: 1,
            map: [[0, 0], [0, 0]],
            player: {
                id: 'player',
                name: 'Player',
                hp: 100,
                attack: 10,
                defense: 5,
                x: 0,
                y: 0,
                equipment: {},
                backupEquipment: [],
                buffs: [],
                keys: { yellow: 0, blue: 0, red: 0 },
                specialItems: [],
            },
            entities: {
                'player_start': { id: 'player_start', type: 'player_start', x: 0, y: 0 },
            },
            monsters: {},
            items: {},
            equipments: {},
            doors: {},
            interactionState: { type: 'none' },
        };
    });

    it('should allow picking up a magic bomb', () => {
        const bombItem: IItem = { id: 'item_bomb', name: 'Magic Bomb', type: 'special', specialType: 'bomb' };
        baseState.items['item_bomb_1'] = bombItem;
        baseState.entities['item_bomb_1'] = { id: 'item_bomb', type: 'item', x: 1, y: 0, ...bombItem };

        const newState = handlePickupItem(baseState, 'item_bomb_1');
        expect(newState.player.specialItems).toContain('bomb');
        expect(newState.items['item_bomb_1']).toBeUndefined();
        expect(newState.entities['item_bomb_1']).toBeUndefined();
    });

    it('should use a magic bomb to destroy all slimes', () => {
        baseState.player.specialItems = ['bomb'];
        const slime1: IMonster = { id: 'slime1', name: 'Slime', hp: 20, attack: 5, defense: 2, x: 1, y: 0, equipment: {}, backupEquipment: [], buffs: [] };
        const slime2: IMonster = { id: 'slime2', name: 'Slime', hp: 20, attack: 5, defense: 2, x: 1, y: 1, equipment: {}, backupEquipment: [], buffs: [] };
        const bat: IMonster = { id: 'bat1', name: 'Bat', hp: 15, attack: 6, defense: 1, x: 0, y: 1, equipment: {}, backupEquipment: [], buffs: [] };

        baseState.monsters = { 'slime1': slime1, 'slime2': slime2, 'bat1': bat };
        baseState.entities['slime1'] = { id: 'slime1', type: 'monster', ...slime1 };
        baseState.entities['slime2'] = { id: 'slime2', type: 'monster', ...slime2 };
        baseState.entities['bat1'] = { id: 'bat1', type: 'monster', ...bat };

        const newState = handleUseBomb(baseState, 'Slime');
        expect(newState.player.specialItems).not.toContain('bomb');
        expect(newState.monsters['slime1']).toBeUndefined();
        expect(newState.monsters['slime2']).toBeUndefined();
        expect(newState.entities['slime1']).toBeUndefined();
        expect(newState.entities['slime2']).toBeUndefined();
        expect(newState.monsters['bat1']).toBeDefined();
        expect(newState.entities['bat1']).toBeDefined();
    });

    it('should pick up monster manual', () => {
        const manualItem: IItem = { id: 'item_manual', name: 'Monster Manual', type: 'special', specialType: 'monster_manual' };
        baseState.items['item_manual_1'] = manualItem;
        baseState.entities['item_manual_1'] = { id: 'item_manual', type: 'item', x: 1, y: 0, ...manualItem };

        const newState = handlePickupItem(baseState, 'item_manual_1');
        expect(newState.player.hasMonsterManual).toBe(true);
    });

    it('should pick up cross and gain stats', () => {
        const crossItem: IItem = { id: 'item_cross', name: 'Cross', type: 'special', specialType: 'cross' };
        baseState.items['item_cross_1'] = crossItem;
        baseState.entities['item_cross_1'] = { id: 'item_cross', type: 'item', x: 1, y: 0, ...crossItem };

        const newState = handlePickupItem(baseState, 'item_cross_1');
        expect(newState.player.attack).toBe(baseState.player.attack + 10);
        expect(newState.player.defense).toBe(baseState.player.defense + 10);
    });

    it('should open a special door after defeating the required monster', () => {
        const boss: IMonster = { id: 'boss1', name: 'Boss', hp: 100, attack: 20, defense: 10, x: 1, y: 1, equipment: {}, backupEquipment: [], buffs: [] };
        baseState.monsters['boss_1'] = boss;
        baseState.entities['boss_1'] = { id: 'boss1', type: 'monster', ...boss };

        const specialDoor: IDoor = { id: 'door_special', color: 'blue', condition: { type: 'DEFEAT_MONSTER', monsterId: 'boss1' } };
        baseState.doors['door_special_1'] = specialDoor;
        baseState.entities['door_special_1'] = { id: 'door_special', type: 'door', x: 0, y: 1, ...specialDoor };

        baseState.interactionState = {
            type: 'battle',
            monsterId: 'boss_1',
            turn: 'player',
            playerHp: 100,
            monsterHp: 1,
            round: 1,
        };

        const playerEntityKey = Object.keys(baseState.entities).find(k => baseState.entities[k].type === 'player_start');
        const newState = handleEndBattle(baseState, playerEntityKey, 'hp_depleted');

        expect(newState.monsters['boss_1']).toBeUndefined();
        expect(newState.entities['boss_1']).toBeUndefined();
        expect(newState.doors['door_special_1']).toBeUndefined();
        expect(newState.entities['door_special_1']).toBeUndefined();
    });
});
