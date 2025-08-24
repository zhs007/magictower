import {
    GameState,
    IPlayer,
    IMonster,
    ICharacter,
    EquipmentSlot,
    Action,
    IEquipment,
} from './types';
import * as _ from 'lodash';
import { AudioManager } from './audio-manager';
import { eventManager } from './event-manager';
import { calculateFinalStats } from './stat-calculator';
import { compareEquipment } from './equipment-manager';
import { dataManager } from '../data/data-manager';
import { LevelData } from '../data/types';

const MAX_COMBAT_ROUNDS = 8;

export function handleMove(state: GameState, dx: number, dy: number): GameState {
    const newState = _.cloneDeep(state);
    const player = newState.player;

    let moveDirection: 'left' | 'right' | 'none' = 'none';
    if (dx > 0) moveDirection = 'right';
    if (dx < 0) moveDirection = 'left';

    // Handle turning in place if necessary
    if (moveDirection !== 'none' && player.direction !== moveDirection) {
        player.direction = moveDirection;
        const playerEntityKey = Object.keys(newState.entities).find(
            (k) => newState.entities[k].type === 'player_start'
        );
        if (playerEntityKey) {
            newState.entities[playerEntityKey].direction = moveDirection;
        }
        return newState; // Return after only turning
    }

    // If we are here, the player is already facing the correct direction or moving vertically.
    // Proceed with movement/interaction.
    const newX = player.x + dx;
    const newY = player.y + dy;

    // Check for collision
    if (
        newX < 0 ||
        newX >= newState.map[0].length ||
        newY < 0 ||
        newY >= newState.map.length ||
        newState.map[newY][newX] === 1
    ) {
        return state; // No change in position or direction
    }

    // Check for entity interaction at the destination
    const destinationEntityKey = Object.keys(newState.entities).find(
        (k) => newState.entities[k].x === newX && newState.entities[k].y === newY
    );

    if (destinationEntityKey) {
        // If the destination entity is an item, set interaction state
        if (newState.items[destinationEntityKey]) {
            return {
                ...newState,
                interactionState: { type: 'item_pickup', itemId: destinationEntityKey },
            };
        }

        const destinationEntity = newState.entities[destinationEntityKey];
        if (destinationEntity.type === 'equipment') {
            // Dispatch equipment pickup action
            return {
                ...newState,
                interactionState: {
                    type: 'PICK_UP_EQUIPMENT',
                    equipmentId: destinationEntityKey,
                } as any,
            }; // Using 'any' to bypass strict type check for custom state
        } else if (destinationEntity.type === 'monster') {
            const monster = newState.monsters[destinationEntityKey];
            if (monster) {
                if (newState.player.x < monster.x) {
                    monster.direction = 'left';
                } else if (newState.player.x > monster.x) {
                    monster.direction = 'right';
                }
            }
            newState.interactionState = {
                type: 'battle',
                monsterId: destinationEntityKey,
                turn: 'player', // This will be immediately re-evaluated in handleStartBattle
                playerHp: newState.player.hp,
                monsterHp: newState.monsters[destinationEntityKey].hp,
                round: 1,
            };
            // Immediately call handleStartBattle to set the correct turn order
            return handleStartBattle(newState, destinationEntityKey);
        }
    } else {
        newState.player.x = newX;
        newState.player.y = newY;
        const playerEntityKey = Object.keys(newState.entities).find(
            (k) => newState.entities[k].type === 'player_start'
        );
        if (playerEntityKey) {
            newState.entities[playerEntityKey].x = newX;
            newState.entities[playerEntityKey].y = newY;
        }
    }

    return newState;
}

export function handlePickupEquipment(state: GameState, equipmentEntityKey: string): GameState {
    const newState = _.cloneDeep(state);
    const equipmentOnMap = newState.equipments[equipmentEntityKey];
    if (!equipmentOnMap) return state;

    const comparison = compareEquipment(newState.player, equipmentOnMap);
    let sound = 'pickup'; // Default sound

    switch (comparison.type) {
        case 'AUTO_EQUIP':
            console.log(`Auto-equipping ${equipmentOnMap.name}.`);
            const targetSlots = Array.isArray(equipmentOnMap.slot)
                ? equipmentOnMap.slot
                : [equipmentOnMap.slot];

            // Move the old item (if any) to backup/inventory
            if (comparison.oldItem) {
                if (Array.isArray(comparison.oldItem)) {
                    for (const old of comparison.oldItem) {
                        if (old) {
                            console.log(`Storing ${old.name} in backup.`);
                            newState.player.backupEquipment.push(old);
                        }
                    }
                } else {
                    console.log(`Storing ${comparison.oldItem.name} in backup.`);
                    newState.player.backupEquipment.push(comparison.oldItem);
                }
            }

            // Equip the new item
            for (const slot of targetSlots) {
                newState.player.equipment[slot] = equipmentOnMap;
            }

            // Remove the item from the map
            delete newState.entities[equipmentEntityKey];
            delete newState.equipments[equipmentEntityKey];
            sound = 'upgrade'; // Special sound for upgrade
            break;

        case 'AUTO_DISCARD':
            console.log(`New equipment ${equipmentOnMap.name} is worse, discarding.`);
            // Just remove the item from the map
            delete newState.entities[equipmentEntityKey];
            delete newState.equipments[equipmentEntityKey];
            sound = 'downgrade'; // Special sound for downgrade
            break;

        case 'PROMPT_SWAP':
            console.log(
                `Prompting user to swap with ${comparison.oldItems.map((i) => i.name).join(', ')}.`
            );
            console.log('Stat changes:', comparison.statChanges);
            // In a real implementation, a UI modal would appear.
            // The game state would enter a 'waiting_for_player_input' mode.
            // For now, we'll just discard the new item to prevent getting stuck.
            delete newState.entities[equipmentEntityKey];
            delete newState.equipments[equipmentEntityKey];
            break;
    }

    // AudioManager.getInstance().playSound(sound); // TODO: Add these sounds
    newState.interactionState = { type: 'none' };
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

export function calculateDamage(attacker: ICharacter, defender: ICharacter): number {
    const attackerStats = calculateFinalStats(attacker);
    const defenderStats = calculateFinalStats(defender);
    const damage = attackerStats.attack - defenderStats.defense;
    return damage <= 0 ? 1 : damage;
}

export function handleStartBattle(state: GameState, monsterEntityKey: string): GameState {
    const newState = _.cloneDeep(state);
    const monster = newState.monsters[monsterEntityKey];
    if (!monster) return state;

    const playerStats = calculateFinalStats(newState.player);
    const monsterStats = calculateFinalStats(monster);

    // Determine turn order based on speed. Player goes first in a tie.
    const turn: 'player' | 'monster' =
        playerStats.speed >= monsterStats.speed ? 'player' : 'monster';

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

    const playerEntityKey = Object.keys(newState.entities).find(
        (k) => newState.entities[k].type === 'player_start'
    );

    const attacker =
        attackerId === playerEntityKey ? newState.player : newState.monsters[attackerId];
    const defender =
        defenderId === playerEntityKey ? newState.player : newState.monsters[defenderId];

    if (!attacker || !defender) return state;

    const damage = calculateDamage(attacker, defender);
    let hpChangedPayload;

    if (defenderId === playerEntityKey) {
        const oldHp = newState.interactionState.playerHp;
        newState.interactionState.playerHp -= damage;
        const playerStats = calculateFinalStats(newState.player);
        hpChangedPayload = {
            entityId: 'player',
            newHp: newState.interactionState.playerHp,
            maxHp: playerStats.maxhp,
            level: playerStats.level,
            exp: playerStats.exp,
            attack: playerStats.attack,
            defense: playerStats.defense,
            oldHp,
        };
    } else {
        const monster = newState.monsters[defenderId];
        const oldHp = newState.interactionState.monsterHp;
        newState.interactionState.monsterHp -= damage;
        hpChangedPayload = {
            entityId: defenderId,
            name: monster.name,
            newHp: newState.interactionState.monsterHp,
            attack: calculateFinalStats(monster).attack,
            defense: calculateFinalStats(monster).defense,
            oldHp,
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
            newState.interactionState.turn =
                newState.interactionState.turn === 'player' ? 'monster' : 'player';
        }
    }

    return newState;
}

function applyLevelUp(player: IPlayer, newLevelData: LevelData): IPlayer {
    const updatedPlayer = _.cloneDeep(player);

    // Calculate stat gains for event dispatching
    const statGains = {
        maxhp: newLevelData.hp - updatedPlayer.maxhp,
        attack: newLevelData.attack - updatedPlayer.attack,
        defense: newLevelData.defense - updatedPlayer.defense,
        speed: newLevelData.speed - updatedPlayer.speed,
    };

    // Apply new base stats from level data
    updatedPlayer.level = newLevelData.level;
    updatedPlayer.maxhp = newLevelData.hp;
    updatedPlayer.attack = newLevelData.attack;
    updatedPlayer.defense = newLevelData.defense;
    updatedPlayer.speed = newLevelData.speed;

    // Restore HP to the new maxHP
    updatedPlayer.hp = updatedPlayer.maxhp;

    eventManager.dispatch('PLAYER_LEVELED_UP', {
        newLevel: updatedPlayer.level,
        statGains,
    });

    return updatedPlayer;
}

export function checkForLevelUp(state: GameState): GameState {
    let newState = _.cloneDeep(state);
    const levelData = dataManager.getLevelData();
    if (!levelData || levelData.length === 0) {
        return newState;
    }

    let leveledUp = false;
    let nextLevel = newState.player.level + 1;
    let nextLevelData = levelData.find((ld) => ld.level === nextLevel);

    // Loop in case of multiple level-ups
    while (nextLevelData && newState.player.exp >= nextLevelData.exp_needed) {
        const oldLevel = newState.player.level;
        newState.player = applyLevelUp(newState.player, nextLevelData);
        leveledUp = true;

        console.log(`Player leveled up from ${oldLevel} to ${newState.player.level}!`);

        nextLevel = newState.player.level + 1;
        nextLevelData = levelData.find((ld) => ld.level === nextLevel);
    }

    return newState;
}

export function handleEndBattle(
    state: GameState,
    winnerId: string | null,
    reason: 'hp_depleted' | 'timeout'
): GameState {
    let newState = _.cloneDeep(state);
    if (newState.interactionState.type !== 'battle') return state;

    const monsterEntityKey = newState.interactionState.monsterId;
    const playerEntityKey = Object.keys(newState.entities).find(
        (k) => newState.entities[k].type === 'player_start'
    );

    // Always update player HP to the final battle state HP, unless they lost.
    newState.player.hp = newState.interactionState.playerHp;

    if (reason === 'hp_depleted') {
        if (winnerId === playerEntityKey) {
            const defeatedMonster = newState.monsters[monsterEntityKey];
            // Player wins, monster is removed
            const defeatedMonsterId = defeatedMonster.id;

            // Calculate and award experience
            const rewardExp =
                Math.floor(defeatedMonster.maxhp / 10) +
                defeatedMonster.attack +
                defeatedMonster.defense +
                defeatedMonster.speed;
            newState.player.exp += rewardExp;

            delete newState.entities[monsterEntityKey];
            delete newState.monsters[monsterEntityKey];

            // Check for level up
            newState = checkForLevelUp(newState);

            // Check for special door conditions
            for (const doorId in newState.doors) {
                const door = newState.doors[doorId];
                if (
                    door.condition?.type === 'DEFEAT_MONSTER' &&
                    door.condition.monsterId === defeatedMonsterId
                ) {
                    const doorEntityKey = Object.keys(newState.entities).find((k) => k === doorId);
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

    const finalPlayerStats = calculateFinalStats(newState.player);
    eventManager.dispatch('BATTLE_ENDED', {
        winnerId,
        reason,
        finalPlayerHp: newState.player.hp,
        finalPlayerMaxHp: finalPlayerStats.maxhp,
        finalPlayerLevel: finalPlayerStats.level,
        finalPlayerExp: finalPlayerStats.exp,
        finalPlayerAtk: finalPlayerStats.attack,
        finalPlayerDef: finalPlayerStats.defense,
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
    const playerEntityKey = Object.keys(newState.entities).find(
        (k) => newState.entities[k].type === 'player_start'
    );
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
                newState.player.hasMonsterManual = true;
                break;
            case 'snowflake':
                // This item is now obsolete and does nothing.
                // It could be repurposed to grant a speed buff in the future.
                break;
            case 'cross':
                // This provides a base stat increase, which is fine.
                newState.player.attack += 10;
                newState.player.defense += 10;
                break;
            case 'bomb':
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

    const doorEntityKey = Object.keys(newState.entities).find((k) => k === doorId);
    if (doorEntityKey) {
        delete newState.entities[doorEntityKey];
    }
    delete newState.doors[doorId];

    AudioManager.getInstance().playSound('door');

    return newState;
}
