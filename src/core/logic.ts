import { GameState, IPlayer, IMonster } from './types';
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

export function calculateBattleOutcome(player: IPlayer, monster: IMonster): BattleOutcome {
    const playerDamageToMonster = Math.max(0, player.attack - monster.defense);
    const monsterDamageToPlayer = Math.max(0, monster.attack - player.defense);

    let playerHp = player.hp;
    let monsterHp = monster.hp;
    let playerTurns = 0;
    let monsterTurns = 0;

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
        if (monsterHp <= 0) break;

        playerHp -= monsterDamageToPlayer;
        monsterTurns++;
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
