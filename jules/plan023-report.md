# Plan 023 Report: Refactor Player and Level Data Structures

## 1. Summary of Work

This task involved a significant refactoring of the core player and level data structures to improve data normalization and remove redundancy. The primary goal was to make `playerdata.json` leaner by removing stats that can be derived from `leveldata.json`.

## 2. Changes Implemented

### a. Data Structure Refactoring

-   **`gamedata/leveldata.json`**: The `hp` field was renamed to `maxhp` across all level entries to more accurately reflect its meaning as the maximum health for that level.
-   **`gamedata/playerdata.json`**: Redundant stat fields (`maxhp`, `attack`, `defense`, `speed`) were removed. The file now only contains the player's essential, non-derivable state: `id`, `name`, `level`, `exp`, current `hp`, and `keys`.
-   **`src/data/types.ts`**: The `LevelData` and `PlayerData` TypeScript interfaces were updated to match the changes in the corresponding JSON files.

### b. Logic Updates

-   **`src/core/state.ts`**: The `GameStateManager.createInitialState` function was modified. It now correctly constructs the initial `IPlayer` object by fetching the base stats from `leveldata.json` based on the player's starting level, and combining them with the data from the now-leaner `playerdata.json`.
-   **`src/core/logic.ts`**: The `applyLevelUp` function was updated to use the new `maxhp` field from `LevelData`, ensuring that players' stats are updated correctly upon leveling up.

### c. Testing and Verification

-   A new test file, `src/core/tests/plan023.test.ts`, was created to specifically validate the refactoring. These tests confirm that the initial player stats are set correctly and that the level-up process works as expected with the new data structure.
-   Existing test suites (`plan021.test.ts`, `state.test.ts`, `save-manager.test.ts`) that were using outdated mocks of `playerdata` and `leveldata` were identified and fixed.
-   All project checks (`npm run check`) and tests (`npm test`) were run successfully, confirming that the changes are correct and have not introduced any regressions. All 111 tests are passing.

## 3. Conclusion

The refactoring was successful. The data structures are now more logical and less redundant, which will make future development and maintenance easier. The system for deriving player stats from their level is robust and fully tested.
