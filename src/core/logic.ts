import { GameState, IPlayer, IMonster, ICharacter, EquipmentSlot, Action } from './types';
import * as _ from 'lodash';

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
    return Math.max(0, attackerStats.totalAttack - defenderStats.totalDefense);
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

export function handleAttack(state: GameState, attackerDataId: string, defenderDataId: string): GameState {
    const newState = _.cloneDeep(state);
    if (newState.interactionState.type !== 'battle') return state;

    const attacker = attackerDataId === 'player' ? newState.player : Object.values(newState.monsters).find(m => m.id === attackerDataId);
    const defender = defenderDataId === 'player' ? newState.player : Object.values(newState.monsters).find(m => m.id === defenderDataId);

    if (!attacker || !defender) return state;

    const damage = calculateDamage(attacker, defender);

    if (defenderDataId === 'player') {
        newState.interactionState.playerHp -= damage;
    } else {
        newState.interactionState.monsterHp -= damage;
    }

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

    if (reason === 'hp_depleted' && winnerId === 'player') {
        newState.player.hp = newState.interactionState.playerHp;
        delete newState.entities[monsterEntityKey];
        delete newState.monsters[monsterEntityKey];
    } else if (reason === 'hp_depleted' && winnerId !== 'player') {
        newState.player.hp = 0;
    }

    newState.interactionState = { type: 'none' };
    return newState;
}

export function handlePickupItem(state: GameState, itemEntityKey: string): GameState {
    const newState = _.cloneDeep(state);
    const item = newState.entities[itemEntityKey];
    if (!item) return state;

    newState.player.x = item.x;
    newState.player.y = item.y;
    const playerEntityKey = Object.keys(newState.entities).find(k => newState.entities[k].type === 'player_start');
    if (playerEntityKey) {
        newState.entities[playerEntityKey].x = item.x;
        newState.entities[playerEntityKey].y = item.y;
    }

    switch (item.id) {
        case 'item_yellow_key':
            newState.player.keys.yellow++;
            break;
    }

    delete newState.entities[itemEntityKey];
    delete newState.items[itemEntityKey];

    newState.interactionState = { type: 'none' };
    return newState;
}

export function handleOpenDoor(state: GameState, doorId: string): GameState {
    const newState = _.cloneDeep(state);
    const door = newState.doors[doorId];
    if (!door) return state;

    delete newState.doors[doorId];
    const doorEntityKey = Object.keys(newState.entities).find(k => newState.entities[k].id === doorId);
    if (doorEntityKey) {
        delete newState.entities[doorEntityKey];
    }

    return newState;
}
