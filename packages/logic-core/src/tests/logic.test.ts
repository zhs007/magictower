import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleMove, handleOpenDoor, handlePickupItem, handleUsePotion } from '../logic';
import { GameState, IItem } from '../types';

describe('handleMove', () => {
    let gameState: GameState;

    beforeEach(() => {
        gameState = {
            currentFloor: 1,
            map: { floor: 1, layout: [
                [0, 0, 1],
                [0, 0, 0],
                [1, 0, 0],
            ] },
            player: {
                id: 'player',
                name: 'Hero',
                level: 1,
                exp: 0,
                hp: 100,
                maxhp: 100,
                attack: 10,
                defense: 5,
                speed: 5,
                x: 1,
                y: 1,
                direction: 'right',
                equipment: {},
                backupEquipment: [],
                buffs: [],
                keys: { yellow: 0, blue: 0, red: 0 },
            },
            entities: {
                player_start_0_0: {
                    type: 'player_start',
                    id: 'player',
                    x: 1,
                    y: 1,
                    direction: 'right',
                },
            },
            monsters: {},
            items: {},
            equipments: {},
            doors: {},
            stairs: {},
            interactionState: { type: 'none' },
        };
    });

    it('should allow player to move to an empty tile', () => {
        const newState = handleMove(gameState, 0, -1); // Move up
        expect(newState.player.x).toBe(1);
        expect(newState.player.y).toBe(0);
        expect(newState.entities['player_start_0_0'].y).toBe(0);
    });

    it('should not allow player to move out of bounds', () => {
        const newState = handleMove(gameState, 0, -2); // Move up out of bounds
        expect(newState.player.x).toBe(1);
        expect(newState.player.y).toBe(1);
    });

    it('should not allow player to move into a wall', () => {
        const newState = handleMove(gameState, 1, 0); // Move right to (2,1)
        const wallState = handleMove(newState, 0, -1); // Move up to a wall at (2,0)
        expect(wallState.player.x).toBe(2);
        expect(wallState.player.y).toBe(1);
    });

    it('should make monster turn left to face player', () => {
        // Player is at x=0, monster is at x=1. Player moves right to engage. Monster should turn left.
        gameState.player.x = 0;
        gameState.entities['player_start_0_0'].x = 0;
        const monster: any = {
            id: 'm1',
            name: 'M',
            level: 1,
            hp: 10,
            maxhp: 10,
            attack: 1,
            defense: 1,
            speed: 2,
            x: 1,
            y: 1,
            direction: 'right',
            equipment: {},
            backupEquipment: [],
            buffs: [],
        };
        gameState.monsters = { m1_key: monster };
        gameState.entities['m1_key'] = { ...monster, type: 'monster' };

        const newState = handleMove(gameState, 1, 0); // Player moves right

        expect(newState.interactionState.type).toBe('battle');
        expect(newState.monsters['m1_key'].direction).toBe('left');
    });

    it('should make monster turn right to face player', () => {
        // Player is at x=2, monster is at x=1. Player moves left to engage. Monster should turn right.
        gameState.player.x = 2;
        gameState.entities['player_start_0_0'].x = 2;
        gameState.player.direction = 'left'; // Player must be facing the direction of movement
        gameState.entities['player_start_0_0'].direction = 'left';

        const monster: any = {
            id: 'm1',
            name: 'M',
            level: 1,
            hp: 10,
            maxhp: 10,
            attack: 1,
            defense: 1,
            speed: 2,
            x: 1,
            y: 1,
            direction: 'left',
            equipment: {},
            backupEquipment: [],
            buffs: [],
        };
        gameState.monsters = { m1_key: monster };
        gameState.entities['m1_key'] = { ...monster, type: 'monster' };

        const newState = handleMove(gameState, -1, 0); // Player moves left

        expect(newState.interactionState.type).toBe('battle');
        expect(newState.monsters['m1_key'].direction).toBe('right');
    });

    it('should only turn player on first press in a new direction', () => {
        // Player is at (1,1) facing left.
        gameState.player.direction = 'left';

        // Attempt to move right.
        const newState = handleMove(gameState, 1, 0);

        // Player should not have moved.
        expect(newState.player.x).toBe(1);
        expect(newState.player.y).toBe(1);

        // Player should have turned right.
        expect(newState.player.direction).toBe('right');
    });

    it('should move player on second press in the same direction', () => {
        // Player is at (1,1) facing right.
        gameState.player.direction = 'right';

        // Attempt to move right.
        const newState = handleMove(gameState, 1, 0);

        // Player should have moved.
        expect(newState.player.x).toBe(2);
        expect(newState.player.y).toBe(1);
        expect(newState.player.direction).toBe('right');
    });

    it('should turn, then do nothing when moving into a wall', () => {
    // Player is at (1,1) facing left, wall is at (2,1)
    gameState.map.layout[1][2] = 1;
        gameState.player.direction = 'left';

        // First press: turn right
        const turnedState = handleMove(gameState, 1, 0);
        expect(turnedState.player.direction).toBe('right');
        expect(turnedState.player.x).toBe(1); // Did not move

        // Second press: attempt to move into wall
        const wallState = handleMove(turnedState, 1, 0);
        expect(wallState.player.x).toBe(1); // Still did not move
        expect(wallState.player.direction).toBe('right'); // Direction is unchanged
    });

    it('should set interactionState to item_pickup when moving onto an item', () => {
        const item = {
            id: 'item_yellow_key',
            name: 'Yellow Key',
            type: 'key' as 'key',
            color: 'yellow' as 'yellow',
        };
        gameState.items['item_1'] = item;
        gameState.entities['item_1'] = { ...item, type: 'item', x: 0, y: 1 };

        // Move player to the item's location
        gameState.player.x = 0;
        gameState.player.y = 0;
        gameState.entities['player_start_0_0'].x = 0;
        gameState.entities['player_start_0_0'].y = 0;

        const newState = handleMove(gameState, 0, 1); // Move down onto the item

        expect(newState.interactionState.type).toBe('item_pickup');
        if (newState.interactionState.type === 'item_pickup') {
            expect(newState.interactionState.itemId).toBe('item_1');
        }
    });

    it('should correctly pick up a key and update player state', () => {
        const item = {
            id: 'item_yellow_key',
            name: 'Yellow Key',
            type: 'key' as 'key',
            color: 'yellow' as 'yellow',
        };
        gameState.items['item_1'] = item;
        gameState.entities['item_1'] = { ...item, type: 'item', x: 0, y: 1 };

        // 1. Turn the player left (player starts at (1,1) facing right)
        const turnState = handleMove(gameState, -1, 0);
        expect(turnState.player.direction).toBe('left');
        expect(turnState.player.x).toBe(1); // Should not have moved yet

        // 2. Move onto the item
        const moveState = handleMove(turnState, -1, 0); // From (1,1) to (0,1)
        expect(moveState.interactionState.type).toBe('item_pickup');
        if (moveState.interactionState.type !== 'item_pickup') return; // Guard for TS

        // 3. Pick up the item
        const finalState = handlePickupItem(moveState, moveState.interactionState.itemId);

        // 4. Verify state changes
        expect(finalState.player.keys.yellow).toBe(1);
        expect(finalState.items['item_1']).toBeUndefined();
        expect(finalState.entities['item_1']).toBeUndefined();
        expect(finalState.interactionState.type).toBe('none');
    });
});

describe('handleOpenDoor', () => {
    it('should allow player to open a door', () => {
        const gameState: GameState = {
            currentFloor: 1,
            map: { floor: 1, layout: [[0]] },
            player: {
                id: 'player',
                name: 'Hero',
                level: 1,
                exp: 0,
                hp: 100,
                maxhp: 100,
                attack: 10,
                defense: 5,
                speed: 5,
                x: 0,
                y: 0,
                direction: 'right',
                equipment: {},
                backupEquipment: [],
                buffs: [],
                keys: { yellow: 0, blue: 0, red: 0 },
            },
            entities: {
                door1: { type: 'door', id: 'door1', x: 0, y: 0 },
            },
            monsters: {},
            items: {},
            equipments: {},
            doors: { door1: { id: 'door1', color: 'yellow' } },
            stairs: {},
            interactionState: { type: 'none' },
        };

        const newState = handleOpenDoor(gameState, 'door1');
        expect(newState.doors['door1']).toBeUndefined();
    });
});

describe('handleUsePotion', () => {
    let gameState: GameState;

    beforeEach(() => {
            gameState = {
            currentFloor: 1,
            map: { floor: 1, layout: [[0]] },
            player: {
                id: 'player',
                name: 'Hero',
                level: 1,
                exp: 0,
                hp: 20,
                maxhp: 100,
                attack: 10,
                defense: 5,
                speed: 5,
                x: 0,
                y: 0,
                direction: 'right',
                equipment: {},
                backupEquipment: [],
                buffs: [],
                keys: { yellow: 0, blue: 0, red: 0 },
                specialItems: ['small_potion'],
            },
            entities: {},
            monsters: {},
            items: {},
            equipments: {},
            doors: {},
            stairs: {},
            interactionState: { type: 'none' },
        };

        // No mock setup needed anymore
    });

    it('should heal the player and consume the potion', () => {
        const mockPotion: IItem = {
            id: 'small_potion',
            name: 'Small Potion',
            type: 'potion',
            value: 80,
        };
        const newState = handleUsePotion(gameState, mockPotion);

        // HP should be healed by 80 (20 + 80 = 100)
        expect(newState.player.hp).toBe(100);
        // Potion should be removed from specialItems
        expect(newState.player.specialItems).not.toContain('small_potion');
    });

    it('should not heal beyond maxhp', () => {
        gameState.player.hp = 50; // Player has 50/100 HP
        const mockPotion: IItem = {
            id: 'small_potion',
            name: 'Small Potion',
            type: 'potion',
            value: 80,
        };
        const newState = handleUsePotion(gameState, mockPotion);

        // HP should be capped at maxhp (50 + 80 = 130, capped at 100)
        expect(newState.player.hp).toBe(100);
    });

    it('should do nothing if player has no potion', () => {
        gameState.player.specialItems = []; // Remove potion
        const mockPotion: IItem = {
            id: 'small_potion',
            name: 'Small Potion',
            type: 'potion',
            value: 80,
        };
        const newState = handleUsePotion(gameState, mockPotion);

        // Game state should be unchanged
        expect(newState).toEqual(gameState);
    });
});
