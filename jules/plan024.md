# Plan 024: Complete Re-balance of Initial Game Stats

This plan outlines a complete redesign of the initial game balance based on a new, more detailed set of user requirements. The goal is to create a more challenging and engaging initial experience for the player.

## 1. Core Design Changes

Based on the latest feedback, the following core changes will be made:

1.  **Increased Monster Threat:** The primary goal is to make the initial 7 monsters a significant challenge. Their attack stats will be substantially increased so that defeating them reduces the player's 150 HP by approximately 70-80% (about 105-120 total damage).
2.  **More Rewarding Level-Up:** The player's stat gains upon reaching Level 2 will be increased to feel more substantial.
3.  **Data Consistency:** All game data will be made consistent. This includes ensuring monster stats are always a minimum of 1 and that the Level 1 data in `leveldata.json` matches the player's starting stats.
4.  **EXP Progression:** The EXP needed for Level 2 will be adjusted to match the new EXP yields of the re-balanced monsters, ensuring the player levels up after defeating the 7 required monsters.

## 2. Final Stat Design

### Player Stats
-   **Level 1:** Atk: 10, Def: 10, Spd: 10, MaxHP: 150
-   **Level 2:** Atk: 18, Def: 18, Spd: 14, MaxHP: 230
-   **EXP for Level 2:** 220

### Monster Stats (All Level 1)

1.  **Attacker Slime (`level1_attack_slime`)**
    -   **Atk**: 30, **Def**: 5, **Spd**: 8, **MaxHP**: 10
    -   *P1 Kills in*: 2 hits
    -   *Total Dmg to P1*: 20
    -   *EXP Yield*: 44

2.  **Average Slime (`level1_average_slime`)**
    -   **Atk**: 16, **Def**: 5, **Spd**: 5, **MaxHP**: 20
    -   *P1 Kills in*: 4 hits
    -   *Total Dmg to P1*: 18
    -   *EXP Yield*: 28

3.  **Defense Slime (`level1_defense_slime`)**
    -   **Atk**: 13, **Def**: 5, **Spd**: 3, **MaxHP**: 30
    -   *P1 Kills in*: 6 hits
    -   *Total Dmg to P1*: 15
    -   *EXP Yield*: 24

**Combat Analysis:**
-   **Total Damage Taken (7 monsters):** `2*20 (Atk) + 3*18 (Avg) + 2*15 (Def) = 40 + 54 + 30 = 124` (82.7% of Player's HP).
-   **Total EXP Gained:** `2*44 + 3*28 + 2*24 = 88 + 84 + 48 = 220`.

## 3. Implementation Steps

1.  **Update `leveldata.json`:** Modify Level 1 to have 150 HP and update Level 2 with the new stats.
2.  **Overwrite Monster Data:** Overwrite the three monster JSON files with the new, high-threat stats.
3.  **Update Validation Script:** Heavily modify `src/core/tests/balance.test.ts` to assert all the new values.
4.  **Verify Implementation:** Run `npm test` to ensure all tests pass.
5.  **Finalize and Submit:** Create a new report (`plan024-report.md`), update `jules.md`, and submit the final changes.
