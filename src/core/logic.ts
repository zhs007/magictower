import { GameState, IPlayer, IMonster, ICharacter, EquipmentSlot, Action } from './types';
import * as _ from 'lodash';
import { AudioManager } from './audio-manager';
import { eventManager } from './event-manager';

const MAX_COMBAT_ROUNDS = 8;

export function handleMove(state: GameState, dx: number, dy: number): GameState {
    const newState = _.cloneDeep(state);
    const newX = newState.player.x + dx;
    const newY = newState.player.y + dy;

    if (newX < 0 || newX >= newState.map[0].length || newY < 0 || newY >= newState.map.length || newState.map[newY][newX] === 1) {
        return state;
    }

    const destinationEntityKey = Object.keys(newState.entities).find(k => newState.entities[k].x === newX && newState.entities[k].y === newY);

    if (destinationEntityKey) {
        const destinationEntity = newState.entities[destinationEntityKey];
        if (destinationEntity.type === 'item') {
            newState.interactionState = { type: 'item_pickup', itemId: destinationEntityKey };
        } else if (destinationEntity.type === 'monster') {
            newState.interactionState = {
                type: 'battle',
                monsterId: destinationEntityKey,
                turn: 'player',
                playerHp: newState.player.hp,
                monsterHp: newState.monsters[destinationEntityKey].hp,
                round: 1,
            };
        }
    } else {
        newState.player.x = newX;
        newState.player.y = newY;
        const playerEntityKey = Object.keys(newState.entities).find(k => newState.entities[k].type === 'player_start');
        if (playerEntityKey) {
            newState.entities[playerEntityKey].x = newX;
            newState.entities[playerEntityKey].y = newY;
        }
    }

    return newState;
}

export function handleUseBomb(state: GameState, monsterType: string): GameState {
    const newState = _.cloneDeep(state);

    // Find and remove the bomb from the player's special items
    const bombIndex = newState.player.specialItems?.indexOf('bomb');
    if (bombIndex === undefined || bombIndex === -1) {
        return state; // No bomb to use
    }
    newState.player.specialItems?.splice(bombIndex, 1);

    // Find all monsters of the specified type and remove them
    const monstersToRemove = Object.keys(newState.monsters).filter(
        (monsterId) => newState.monsters[monsterId].name === monsterType
    );

    for (const monsterId of monstersToRemove) {
        delete newState.monsters[monsterId];
        const entityKey = Object.keys(newState.entities).find(
            (k) => newState.entities[k].id === monsterId
        );
        if (entityKey) {
            delete newState.entities[entityKey];
        }
    }

    return newState;
}

function getCharacterTotalStats(character: ICharacter): { totalAttack: number; totalDefense: number } {
    let totalAttack = character.attack;
    let totalDefense = character.defense;
    for (const slot of Object.values(EquipmentSlot)) {
        const equipment = character.equipment[slot];
        if (equipment) {
            totalAttack += equipment.attackBonus || 0;
            totalDefense += equipment.defenseBonus || 0;
        }
    }
    return { totalAttack, totalDefense };
}

export function calculateDamage(attacker: ICharacter, defender: ICharacter): number {
    const attackerStats = getCharacterTotalStats(attacker);
    const defenderStats = getCharacterTotalStats(defender);
    const damage = attackerStats.totalAttack - defenderStats.totalDefense;
    return damage <= 0 ? 1 : damage;
}

export function handleStartBattle(state: GameState, monsterEntityKey: string): GameState {
    const newState = _.cloneDeep(state);
    const monster = newState.monsters[monsterEntityKey];
    if (!monster) return state;

    let turn: 'player' | 'monster' = 'player';
    const playerHasFirstStrike = newState.player.buffs.some(b => b.id === 'buff_first_strike' && b.charges > 0);
    const monsterHasFirstStrike = monster.buffs.some(b => b.id === 'buff_first_strike' && b.charges > 0);

    if (monsterHasFirstStrike && !playerHasFirstStrike) {
        turn = 'monster';
    }

    newState.interactionState = {
        type: 'battle',
        monsterId: monsterEntityKey,
        turn,
        playerHp: newState.player.hp,
        monsterHp: monster.hp,
        round: 1,
    };

    return newState;
}

export function handleAttack(state: GameState, attackerId: string, defenderId: string): GameState {
    const newState = _.cloneDeep(state);
    if (newState.interactionState.type !== 'battle') return state;

    const playerEntityKey = Object.keys(newState.entities).find(k => newState.entities[k].type === 'player_start');

    const attacker = attackerId === playerEntityKey ? newState.player : newState.monsters[attackerId];
    const defender = defenderId === playerEntityKey ? newState.player : newState.monsters[defenderId];

    if (!attacker || !defender) return state;

    const damage = calculateDamage(attacker, defender);
    let hpChangedPayload;

    if (defenderId === playerEntityKey) {
        const oldHp = newState.interactionState.playerHp;
        newState.interactionState.playerHp -= damage;
        hpChangedPayload = {
            entityId: 'player',
            newHp: newState.interactionState.playerHp,
            attack: newState.player.attack,
            defense: newState.player.defense,
            oldHp
        };
    } else {
        const monster = newState.monsters[defenderId];
        const oldHp = newState.interactionState.monsterHp;
        newState.interactionState.monsterHp -= damage;
        hpChangedPayload = {
            entityId: defenderId,
            name: monster.name,
            newHp: newState.interactionState.monsterHp,
            attack: monster.attack,
            defense: monster.defense,
            oldHp
        };
    }

    eventManager.dispatch('HP_CHANGED', hpChangedPayload);
    AudioManager.getInstance().playSound('attack');

    if (newState.interactionState.playerHp <= 0 || newState.interactionState.monsterHp <= 0) {
        newState.interactionState.turn = 'battle_end';
    } else {
        if (newState.interactionState.turn === 'monster') {
            newState.interactionState.round++;
        }

        if (newState.interactionState.round > MAX_COMBAT_ROUNDS) {
            newState.interactionState.turn = 'battle_end';
        } else {
            newState.interactionState.turn = newState.interactionState.turn === 'player' ? 'monster' : 'player';
        }
    }

    return newState;
}

export function handleEndBattle(state: GameState, winnerId: string | null, reason: 'hp_depleted' | 'timeout'): GameState {
    const newState = _.cloneDeep(state);
    if (newState.interactionState.type !== 'battle') return state;

    const monsterEntityKey = newState.interactionState.monsterId;
    const playerEntityKey = Object.keys(newState.entities).find(k => newState.entities[k].type === 'player_start');

    // Always update player HP to the final battle state HP, unless they lost.
    newState.player.hp = newState.interactionState.playerHp;

    if (reason === 'hp_depleted') {
        if (winnerId === playerEntityKey) {
            // Player wins, monster is removed
            const defeatedMonsterId = newState.monsters[monsterEntityKey].id;
            delete newState.entities[monsterEntityKey];
            delete newState.monsters[monsterEntityKey];

            // Check for special door conditions
            for (const doorId in newState.doors) {
                const door = newState.doors[doorId];
                if (door.condition?.type === 'DEFEAT_MONSTER' && door.condition.monsterId === defeatedMonsterId) {
                    const doorEntityKey = Object.keys(newState.entities).find(k => k === doorId);
                    if (doorEntityKey) {
                        delete newState.entities[doorEntityKey];
                    }
                    delete newState.doors[doorId];
                }
            }
        } else if (winnerId === monsterEntityKey) {
            // Player loses, HP is set to 0
            newState.player.hp = 0;
        }
    }
    // If reason is timeout, player HP is already updated to its final battle value.

    eventManager.dispatch('BATTLE_ENDED', {
        winnerId,
        reason,
        finalPlayerHp: newState.player.hp,
        finalPlayerAtk: newState.player.attack,
        finalPlayerDef: newState.player.defense,
    });
    newState.interactionState = { type: 'none' };
    return newState;
}

export function handlePickupItem(state: GameState, itemEntityKey: string): GameState {
    const newState = _.cloneDeep(state);
    const item = newState.items[itemEntityKey];
    if (!item) return state;

    const itemEntity = newState.entities[itemEntityKey];
    newState.player.x = itemEntity.x;
    newState.player.y = itemEntity.y;
    const playerEntityKey = Object.keys(newState.entities).find(k => newState.entities[k].type === 'player_start');
    if (playerEntityKey) {
        newState.entities[playerEntityKey].x = itemEntity.x;
        newState.entities[playerEntityKey].y = itemEntity.y;
    }

    if (item.type === 'key') {
        if (item.color === 'yellow') {
            newState.player.keys.yellow++;
            eventManager.dispatch('KEYS_CHANGED', { keys: newState.player.keys });
        }
    } else if (item.type === 'special') {
        switch (item.specialType) {
            case 'monster_manual':
                // This is a permanent unlock, so we'll need a way to store it.
                // For now, let's assume a flag on the player object.
                newState.player.hasMonsterManual = true;
                break;
            case 'snowflake':
                newState.player.buffs.push({
                    id: 'first_strike',
                    name: 'First Strike',
                    duration: -1,
                    charges: 2,
                    triggers: ['on_battle_start']
                });
                break;
            case 'cross':
                newState.player.attack += 10;
                newState.player.defense += 10;
                break;
            case 'bomb':
                // Add to inventory, assuming an inventory system exists.
                // For now, let's add it to a simple array on the player.
                if (!newState.player.specialItems) {
                    newState.player.specialItems = [];
                }
                newState.player.specialItems.push('bomb');
                break;
        }
    }

    delete newState.entities[itemEntityKey];
    delete newState.items[itemEntityKey];

    AudioManager.getInstance().playSound('pickup');

    newState.interactionState = { type: 'none' };
    return newState;
}

export function handleOpenDoor(state: GameState, doorId: string): GameState {
    const newState = _.cloneDeep(state);
    const door = newState.doors[doorId];
    if (!door) return state;

    const doorEntityKey = Object.keys(newState.entities).find(k => k === doorId);
    if (doorEntityKey) {
        delete newState.entities[doorEntityKey];
    }
    delete newState.doors[doorId];

    AudioManager.getInstance().playSound('door');

    return newState;
}
