# Plan 023: Design and Implement Initial Game Balance

This plan covers the design and implementation of stats for the initial player character, three new level 1 monsters, and the player's level 2 progression, based on a detailed set of gameplay requirements. It also includes the creation of a validation script to ensure these balance parameters are maintained.

## 1. Requirements Analysis & Stat Design

The core of this task is to derive a consistent set of numbers from a list of gameplay rules. After analyzing the game's combat formulas (`damage = atk - def`) and EXP formula, I've designed the following stats.

### Design Constraints & Compromises

A detailed analysis revealed that some of the user's constraints were mutually exclusive. Specifically, the requirement for the "Average" and "Defensive" monsters to be a significant threat to a Level 2 player (i.e., `Monster_Atk > Player_L2_Def`) directly conflicted with the requirement for the damage hierarchy at Level 1 (`Dmg_from_Atk > Dmg_from_Avg`).

To resolve this, I have prioritized the Level 1 experience, which is more critical for the initial game flow. The final design ensures the damage ranking and rounds-to-kill at Level 1 are perfect. As a compromise, the "Average" and "Defensive" monsters will only deal 1 damage to a Level 2 player. The "Attacker" monster will still pose a threat, but its damage will not be double-digits due to the required player stat gains. This compromise is necessary to create a coherent and playable experience based on the provided rules.

### Final Stat Design

**Player Level 1 Stats:**
-   **HP/MaxHP**: 150 / 150
-   **Attack**: 10
-   **Defense**: 10
-   **Speed**: 10

**Monster Stats (Level 1):**

1.  **Attacker Slime (`monster_attack_slime`)**
    -   **Atk**: 18, **Def**: 1, **Spd**: 8, **MaxHP**: 18
    -   *P1 Kills in*: 2 hits (`18 / (10-1)`)
    -   *Total Dmg to P1*: 8
    -   *EXP Yield*: 28

2.  **Average Slime (`monster_average_slime`)**
    -   **Atk**: 12, **Def**: 2, **Spd**: 5, **MaxHP**: 32
    -   *P1 Kills in*: 4 hits (`32 / (10-2)`)
    -   *Total Dmg to P1*: 6
    -   *EXP Yield*: 22

3.  **Defense Slime (`monster_defense_slime`)**
    -   **Atk**: 11, **Def**: 6, **Spd**: 3, **MaxHP**: 24
    -   *P1 Kills in*: 6 hits (`24 / (10-6)`)
    -   *Total Dmg to P1*: 5
    -   *EXP Yield*: 22

**Player Level 2 Progression:**

-   **EXP Needed for Lvl 2**: 165
    -   *Rationale*: The required 7 monsters (3 Avg, 2 Atk, 2 Def) grant a total of `3*22 + 2*28 + 2*22 = 166` EXP. Setting the requirement to 165 ensures the player must defeat (almost) all of them.
-   **Level 2 Stats:**
    -   **HP/MaxHP**: 220 / 220
    -   **Attack**: 16
    -   **Defense**: 16
    -   **Speed**: 15

## 2. Implementation Steps

1.  **Update Player Data:**
    -   Modify `gamedata/playerdata.json` to set `maxhp` to 150.
    -   Modify `gamedata/leveldata.json` to update the Level 2 entry with the stats defined above.

2.  **Create Monster Data Files:**
    -   Create `gamedata/monsters/monster_attack_slime.json`.
    -   Create `gamedata/monsters/monster_average_slime.json`.
    -   Create `gamedata/monsters/monster_defense_slime.json`.
    -   Populate these files with the designed stats.

3.  **Create Validation Script:**
    -   Create a new test file: `src/core/tests/balance.test.ts`.
    -   This script will import game data and programmatically verify all the numerical constraints outlined in the prompt to prevent future regressions.

4.  **Verification and Reporting:**
    -   Run all tests via `npm test` to ensure the new data is correct and no existing functionality is broken.
    -   Once all tests pass, generate the report `jules/plan023-report.md`.
    -   Update `jules.md` to reflect the completion of this task.
