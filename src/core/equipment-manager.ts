import { ICharacter, IEquipment, EquipmentSlot, WeaponType } from './types';
import { calculateFinalStats, CalculableStats } from './stat-calculator';
import * as _ from 'lodash';

export type EquipmentComparisonResult =
    | { type: 'AUTO_EQUIP'; oldItem?: IEquipment | IEquipment[] }
    | { type: 'AUTO_DISCARD' }
    | { type: 'PROMPT_SWAP'; statChanges: Record<CalculableStats, number>, oldItems: IEquipment[] };

function getStatChanges(originalStats: Record<CalculableStats, number>, newStats: Record<CalculableStats, number>): Record<CalculableStats, number> {
    const changes: Record<CalculableStats, number> = { hp: 0, attack: 0, defense: 0, speed: 0 };
    for (const key in originalStats) {
        const statKey = key as CalculableStats;
        changes[statKey] = newStats[statKey] - originalStats[statKey];
    }
    return changes;
}

export function compareEquipment(character: ICharacter, newEquipment: IEquipment): EquipmentComparisonResult {
    const originalStats = calculateFinalStats(character);
    const tempChar = _.cloneDeep(character);

    // --- Determine what's currently equipped in the target slots ---
    const targetSlots = Array.isArray(newEquipment.slot) ? newEquipment.slot : [newEquipment.slot];
    const oldItems = targetSlots
        .map(slot => character.equipment[slot])
        .filter((item): item is IEquipment => !!item);

    const uniqueOldItems = _.uniq(oldItems);

    // --- Handle Special Case: Weapon Swaps (1H vs 2H) ---
    const isNewItemWeapon = !!newEquipment.weaponType;
    if (isNewItemWeapon) {
        const rightHandWeapon = character.equipment.RIGHT_HAND?.weaponType ? character.equipment.RIGHT_HAND : undefined;
        const leftHandWeapon = character.equipment.LEFT_HAND?.weaponType ? character.equipment.LEFT_HAND : undefined;
        const isCurrentlyTwoHanded = rightHandWeapon && leftHandWeapon && rightHandWeapon.id === leftHandWeapon.id;

        const isNewItemTwoHanded = newEquipment.weaponType === WeaponType.TWO_HANDED;

        // Case 1: Going from 1H (or two different 1H) to 2H
        if (isNewItemTwoHanded && (rightHandWeapon || leftHandWeapon) && !isCurrentlyTwoHanded) {
            const oldWeapons = [rightHandWeapon, leftHandWeapon].filter((i): i is IEquipment => !!i);
            tempChar.equipment.LEFT_HAND = newEquipment;
            tempChar.equipment.RIGHT_HAND = newEquipment;
            const newStats = calculateFinalStats(tempChar);
            const statChanges = getStatChanges(originalStats, newStats);
            return { type: 'PROMPT_SWAP', statChanges, oldItems: _.uniq(oldWeapons) };
        }
        // Case 2: Going from 2H to 1H
        if (!isNewItemTwoHanded && isCurrentlyTwoHanded) {
            const oldWeapon = character.equipment.RIGHT_HAND!;
            // Assume new 1H weapon goes to the right hand, freeing the left.
            delete tempChar.equipment.LEFT_HAND;
            tempChar.equipment.RIGHT_HAND = newEquipment;
            const newStats = calculateFinalStats(tempChar);
            const statChanges = getStatChanges(originalStats, newStats);
            return { type: 'PROMPT_SWAP', statChanges, oldItems: [oldWeapon] };
        }
    }

    // --- Standard Case: Regular swaps or equipping to empty slots ---
    if (uniqueOldItems.length === 0) {
        return { type: 'AUTO_EQUIP' }; // Empty slot
    }

    // Simulate the swap
    for (const slot of targetSlots) {
        tempChar.equipment[slot] = newEquipment;
    }
    // If equipping a 1H weapon, ensure the other hand is not a 2H weapon
    if (newEquipment.weaponType === WeaponType.ONE_HANDED) {
         if (targetSlots.includes(EquipmentSlot.RIGHT_HAND) && tempChar.equipment.LEFT_HAND?.weaponType === WeaponType.TWO_HANDED) {
            delete tempChar.equipment.LEFT_HAND;
         }
         if (targetSlots.includes(EquipmentSlot.LEFT_HAND) && tempChar.equipment.RIGHT_HAND?.weaponType === WeaponType.TWO_HANDED) {
            delete tempChar.equipment.RIGHT_HAND;
         }
    }

    const newStats = calculateFinalStats(tempChar);
    const statChanges = getStatChanges(originalStats, newStats);

    const increases = Object.values(statChanges).filter(v => v > 0).length;
    const decreases = Object.values(statChanges).filter(v => v < 0).length;

    if (decreases === 0 && increases > 0) {
        return { type: 'AUTO_EQUIP', oldItem: uniqueOldItems.length > 1 ? uniqueOldItems : uniqueOldItems[0] }; // Pure upgrade
    } else if (increases === 0 && decreases > 0) {
        return { type: 'AUTO_DISCARD' }; // Pure downgrade
    } else if (increases > 0 && decreases > 0) {
        return { type: 'PROMPT_SWAP', statChanges, oldItems: uniqueOldItems }; // Mixed results
    } else {
        // No effective change, or only zero-value changes. Treat as an upgrade but don't bother swapping.
        // For simplicity, we can call it a discard, or auto-equip if you want the item to change. Let's say discard.
        return { type: 'AUTO_DISCARD' };
    }
}
