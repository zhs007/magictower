# Plan 021 Report: Level and Experience System Implementation

## 1. Task Summary

This task involved implementing a comprehensive level and experience point (EXP) system for the game. This included adding new attributes to characters, creating new data files for player and level progression, implementing the core logic for EXP gain and leveling up, updating the UI to display the new information, and writing a full suite of unit tests to guarantee functionality.

## 2. Implemented Features

### 2.1. New Character Attributes
-   **`level`**: Added to all characters (`ICharacter`).
-   **`maxhp`**: Added to all characters to distinguish from current `hp`.
-   **`exp`**: Added to the player (`IPlayer`).

### 2.2. Game Data Configuration
-   Created `gamedata/playerdata.json` to define the player's initial stats, moving them out of hardcoded values in the source code.
-   Created `gamedata/leveldata.json` to define the level progression table. This table dictates the EXP required for each level and the base stats (HP, Attack, Defense, Speed) a player has at that level.
-   Updated existing monster data files to include `level` and `maxhp`.

### 2.3. Core Gameplay Logic
-   **Experience Calculation**: When a monster is defeated, the player is awarded experience points based on a formula: `(monster.maxhp / 10) + monster.attack + monster.defense + monster.speed`.
-   **Level-Up Mechanism**:
    -   After gaining EXP, the system checks if the player's total EXP meets the threshold for the next level as defined in `leveldata.json`.
    -   Upon leveling up, the player's base stats are updated to match the new level's values.
    -   The player's `hp` is fully restored to their new `maxhp`.
    -   The system correctly handles gaining multiple levels from a single, large EXP reward.

### 2.4. UI Enhancements
-   The game's Heads-Up Display (HUD) was updated to show the player's current `Level`.
-   The HP display now shows `HP current/max`.
-   A new EXP display shows the player's progress towards the next level, for example: `EXP: 15 / 100`.

### 2.5. Testing
-   A new test suite (`src/core/tests/plan021.test.ts`) was created to cover all aspects of the new system.
-   Tests verify:
    -   Correct loading of `playerdata.json` and `leveldata.json`.
    -   Accurate EXP reward calculation.
    -   Correct single-level advancement.
    -   Correct handling of multi-level advancement.
-   All tests are passing.

## 3. Conclusion

The level and experience system has been successfully integrated into the game's core, providing a fundamental progression mechanic. The implementation is data-driven, robust, and fully tested, laying a strong foundation for future content and gameplay features.
