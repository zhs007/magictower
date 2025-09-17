import { ICharacter, IEquipment, IPlayer } from './types';

// A type defining the stats that can be calculated.
export type CalculableStats = 'hp' | 'attack' | 'defense' | 'speed';

/**
 * Type guard to check if a character is a player.
 * @param character The character to check.
 * @returns True if the character is an IPlayer.
 */
function isPlayer(character: ICharacter): character is IPlayer {
    return 'exp' in character;
}

/**
 * Calculates the final stats of a character, applying all equipment modifiers.
 * The final value is calculated as: `base + flat_bonuses + floor(base * percent_bonuses)`.
 * Percentage bonuses are expressed as decimals (e.g., 0.1 for +10%).
 * All final stats are floored and cannot be less than 1.
 *
 * @param character The character whose stats are to be calculated.
 * @returns A record containing the final calculated stats, plus non-calculable stats.
 */
export function calculateFinalStats(
    character: ICharacter
): Record<CalculableStats, number> & { maxhp: number; level: number; exp: number } {
    const baseStats = {
        hp: character.maxhp, // Note: Using maxhp as the base for HP calculations
        attack: character.attack,
        defense: character.defense,
        speed: character.speed,
    };

    const flatBonuses: Record<CalculableStats, number> = { hp: 0, attack: 0, defense: 0, speed: 0 };
    const percentBonuses: Record<CalculableStats, number> = {
        hp: 0,
        attack: 0,
        defense: 0,
        speed: 0,
    };

    // Aggregate bonuses from all equipped items
    for (const slot in character.equipment) {
        const item = character.equipment[slot as keyof typeof character.equipment] as
            | IEquipment
            | undefined;
        if (item) {
            if (item.stat_mods) {
                for (const stat in item.stat_mods) {
                    const key = stat as CalculableStats;
                    flatBonuses[key] += item.stat_mods[key] || 0;
                }
            }
            if (item.percent_mods) {
                for (const stat in item.percent_mods) {
                    const key = stat as CalculableStats;
                    percentBonuses[key] += item.percent_mods[key] || 0;
                }
            }
        }
    }

    // Calculate final stats
    const finalStats: Record<CalculableStats, number> = {} as any;
    for (const stat in baseStats) {
        const key = stat as CalculableStats;
        const baseValue = baseStats[key];
        const flatValue = flatBonuses[key];
        const percentValue = percentBonuses[key];

        // Formula: final = base + flat_bonuses + (base * percent_bonuses)
        let finalValue = baseValue + flatValue + Math.floor(baseValue * percentValue);

        // Enforce the rule that stats cannot be 0 or negative.
        if (finalValue < 1) {
            finalValue = 1;
        }
        finalStats[key] = finalValue;
    }

    // Also include non-calculable stats in the final returned object
    const finalStatsWithExtras = {
        ...finalStats,
        maxhp: finalStats.hp, // The new maxhp is the calculated hp stat
        level: character.level,
        exp: isPlayer(character) ? character.exp : 0,
    };

    // The 'hp' stat in CalculableStats actually represents 'maxhp'.
    // We return it as `maxhp` in the final object, but the current character's `hp` should be returned as `hp`.
    // This is a bit of a mix-up in the original design.
    // The contract of this function is to return the *potential* stats.
    // The final object has a `maxhp` property, but the `hp` property from `finalStats` is actually the calculated maxhp.
    // To fix this without a major breaking change, we will rename the calculated `hp` to `maxhp`
    // and then decide what to do with the `hp` property.
    // For now, let's assume the `hp` in the returned object should be the character's current hp, clamped to the new maxhp.

    const calculatedMaxHp = finalStats.hp;
    finalStatsWithExtras.maxhp = calculatedMaxHp;
    finalStatsWithExtras.hp = Math.min(character.hp, calculatedMaxHp);


    return finalStatsWithExtras;
}
