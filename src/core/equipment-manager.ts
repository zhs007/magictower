import { ICharacter, IEquipment, EquipmentSlot, WeaponType } from './types';
import { calculateFinalStats, CalculableStats } from './stat-calculator';
import * as _ from 'lodash';

export type EquipmentComparisonResult =
    | { type: 'AUTO_EQUIP'; oldItem?: IEquipment | IEquipment[] }
    | { type: 'AUTO_DISCARD' }
    | { type: 'PROMPT_SWAP'; statChanges: Record<CalculableStats, number>; oldItems: IEquipment[] };

function getStatChanges(
    originalStats: Record<CalculableStats, number>,
    newStats: Record<CalculableStats, number>
): Record<CalculableStats, number> {
    const changes: Record<CalculableStats, number> = { hp: 0, attack: 0, defense: 0, speed: 0 };
    for (const key in originalStats) {
        const statKey = key as CalculableStats;
        changes[statKey] = newStats[statKey] - originalStats[statKey];
    }
    return changes;
}

export function compareEquipment(
    character: ICharacter,
    newEquipment: IEquipment
): EquipmentComparisonResult {
    const originalStats = calculateFinalStats(character);

    const isNewItemWeapon = !!newEquipment.weaponType;
    const rightHandItem = character.equipment[EquipmentSlot.RIGHT_HAND];
    const leftHandItem = character.equipment[EquipmentSlot.LEFT_HAND];
    const isCurrentlyTwoHanded = rightHandItem?.weaponType === WeaponType.TWO_HANDED;

    // --- Special Case: Weapon Swaps ---
    if (isNewItemWeapon || rightHandItem?.weaponType || leftHandItem?.weaponType) {
        const tempChar = _.cloneDeep(character);
        const isNewItemTwoHanded = newEquipment.weaponType === WeaponType.TWO_HANDED;

        // Case 1: Swapping to a 2H weapon
        if (isNewItemTwoHanded) {
            const oldWeapons = [leftHandItem, rightHandItem].filter(
                (item) => item?.weaponType
            ) as IEquipment[];
            tempChar.equipment[EquipmentSlot.LEFT_HAND] = newEquipment;
            tempChar.equipment[EquipmentSlot.RIGHT_HAND] = newEquipment;
            const newStats = calculateFinalStats(tempChar);
            const statChanges = getStatChanges(originalStats, newStats);
            return { type: 'PROMPT_SWAP', statChanges, oldItems: _.uniq(oldWeapons) };
        }
        // Case 2: Swapping from 2H to 1H
        if (!isNewItemTwoHanded && isCurrentlyTwoHanded) {
            const oldWeapon = rightHandItem!;
            // Assume new 1H weapon goes to the right hand, freeing the left.
            delete tempChar.equipment[EquipmentSlot.LEFT_HAND];
            tempChar.equipment[EquipmentSlot.RIGHT_HAND] = newEquipment;
            const newStats = calculateFinalStats(tempChar);
            const statChanges = getStatChanges(originalStats, newStats);
            return { type: 'PROMPT_SWAP', statChanges, oldItems: [oldWeapon] };
        }
    }

    // --- Standard Case: Regular swaps or equipping to empty slots ---
    const tempChar = _.cloneDeep(character);
    const targetSlots = Array.isArray(newEquipment.slot) ? newEquipment.slot : [newEquipment.slot];
    const oldItems = targetSlots
        .map((slot) => character.equipment[slot as keyof typeof character.equipment])
        .filter((item): item is IEquipment => !!item);
    const uniqueOldItems = _.uniq(oldItems);

    if (uniqueOldItems.length === 0) {
        return { type: 'AUTO_EQUIP', oldItem: undefined };
    }

    for (const slot of targetSlots) {
        tempChar.equipment[slot as keyof typeof tempChar.equipment] = newEquipment;
    }

    const newStats = calculateFinalStats(tempChar);
    const statChanges = getStatChanges(originalStats, newStats);

    const increases = Object.values(statChanges).filter((v) => v > 0).length;
    const decreases = Object.values(statChanges).filter((v) => v < 0).length;

    if (decreases === 0 && increases > 0) {
        return {
            type: 'AUTO_EQUIP',
            oldItem: uniqueOldItems.length > 1 ? uniqueOldItems : uniqueOldItems[0],
        };
    }
    if (increases === 0 && decreases > 0) {
        return { type: 'AUTO_DISCARD' };
    }
    if (increases > 0 && decreases > 0) {
        return { type: 'PROMPT_SWAP', statChanges, oldItems: uniqueOldItems };
    }

    return { type: 'AUTO_DISCARD' };
}
