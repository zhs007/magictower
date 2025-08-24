import { ICharacter, IEquipment } from './types';

// A type defining the stats that can be calculated.
export type CalculableStats = 'hp' | 'attack' | 'defense' | 'speed';

/**
 * Calculates the final stats of a character, applying all equipment modifiers.
 *
 * @param character The character whose stats are to be calculated.
 * @returns A record containing the final calculated stats, plus non-calculable stats.
 */
export function calculateFinalStats(
    character: ICharacter
): Record<CalculableStats, number> & { maxhp: number; level: number; exp: number } {
    const baseStats = {
        hp: character.hp,
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
        maxhp: character.maxhp,
        level: character.level,
        exp: (character as any).exp ?? 0, // Monsters don't have exp, so default to 0
    };

    return finalStatsWithExtras;
}
