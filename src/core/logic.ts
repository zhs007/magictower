import { GameState, IPlayer, IMonster, ICharacter, EquipmentSlot } from './types';
import * as _ from 'lodash';

export function handleMove(state: GameState, dx: number, dy: number): GameState {
    const newState = _.cloneDeep(state);
    const newX = newState.player.x + dx;
    const newY = newState.player.y + dy;

    // Check boundaries
    if (newX < 0 || newX >= newState.map[0].length || newY < 0 || newY >= newState.map.length) {
        return state; // Out of bounds, do nothing
    }

    const destinationTile = newState.map[newY][newX];

    // Check for walls or other impassable terrain
    // This part of logic will be expanded later. For now, we assume any tile without an entity is movable.

    if (destinationTile.entityLayer) {
        // Handle collision with entities (monsters, items, etc.)
        // This will be expanded in later steps.
    } else {
        // Move player
        newState.player.x = newX;
        newState.player.y = newY;
    }

    return newState;
}

export interface BattleOutcome {
    playerHpLoss: number;
    monsterHpLoss: number;
    didPlayerWin: boolean;
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

export function calculateBattleOutcome(player: IPlayer, monster: IMonster): BattleOutcome {
    const playerStats = getCharacterTotalStats(player);
    const monsterStats = getCharacterTotalStats(monster);

    const playerDamageToMonster = Math.max(0, playerStats.totalAttack - monsterStats.totalDefense);
    const monsterDamageToPlayer = Math.max(0, monsterStats.totalAttack - playerStats.totalDefense);

    let playerHp = player.hp;
    let monsterHp = monster.hp;
    let playerTurns = 0;
    let monsterTurns = 0;

    // --- Buff Logic: ON_BATTLE_START ---
    const playerHasFirstStrike = player.buffs.some(b => b.id === 'buff_first_strike' && b.charges > 0);
    const monsterHasFirstStrike = monster.buffs.some(b => b.id === 'buff_first_strike' && b.charges > 0);

    if (playerHasFirstStrike && !monsterHasFirstStrike) {
        monsterHp -= playerDamageToMonster;
    } else if (monsterHasFirstStrike && !playerHasFirstStrike) {
        playerHp -= monsterDamageToPlayer;
    }

    // Simplified turn-based combat until one is defeated
    while (playerHp > 0 && monsterHp > 0) {
        if (playerDamageToMonster <= 0) {
            // Player cannot damage monster, so player will eventually lose if monster can do damage.
            // To prevent infinite loops, we can assume the battle ends here.
            playerHp = 0; // Player loses
            break;
        }
        monsterHp -= playerDamageToMonster;
        playerTurns++;
        if (monsterHp <= 0) {
            // --- Buff Logic: ON_HP_LESS_THAN_ZERO ---
            const monsterHasLifeSaving = monster.buffs.some(b => b.id === 'buff_life_saving' && b.charges > 0);
            if (monsterHasLifeSaving) {
                monsterHp = 1;
                // In a real implementation, we would mark the buff as consumed.
                // Since this function is pure, we assume the caller handles state changes.
            } else {
                break;
            }
        }

        playerHp -= monsterDamageToPlayer;
        monsterTurns++;
        if (playerHp <= 0) {
            // --- Buff Logic: ON_HP_LESS_THAN_ZERO ---
            const playerHasLifeSaving = player.buffs.some(b => b.id === 'buff_life_saving' && b.charges > 0);
            if (playerHasLifeSaving) {
                playerHp = 1;
            } else {
                break;
            }
        }
    }

    const finalPlayerHp = Math.max(0, playerHp);
    const finalMonsterHp = Math.max(0, monsterHp);

    return {
        playerHpLoss: player.hp - finalPlayerHp,
        monsterHpLoss: monster.hp - finalMonsterHp,
        didPlayerWin: monsterHp <= 0,
    };
}

export function handlePickupItem(state: GameState, itemId: string): GameState {
    const newState = _.cloneDeep(state);
    const item = newState.items[itemId];
    if (!item) return state;

    switch (item.type) {
        case 'potion':
            newState.player.hp += item.value || 0;
            break;
        case 'key':
            // Key logic will be added later.
            break;
    }

    // Remove item from game state
    delete newState.items[itemId];
    // Find and clear the item from the map
    for (let y = 0; y < newState.map.length; y++) {
        for (let x = 0; x < newState.map[0].length; x++) {
            const tile = newState.map[y][x];
            if (tile.entityLayer && tile.entityLayer.id === itemId) {
                tile.entityLayer = undefined;
            }
        }
    }

    return newState;
}

export function handleOpenDoor(state: GameState, doorId: string): GameState {
    const newState = _.cloneDeep(state);
    const door = newState.doors[doorId];
    if (!door) return state;

    // For now, we assume the player has the key. Key checking will be added later.

    // Remove door from game state
    delete newState.doors[doorId];
    // Find and clear the door from the map
    for (let y = 0; y < newState.map.length; y++) {
        for (let x = 0; x < newState.map[0].length; x++) {
            const tile = newState.map[y][x];
            if (tile.entityLayer && tile.entityLayer.id === doorId) {
                tile.entityLayer = undefined;
            }
        }
    }

    return newState;
}
