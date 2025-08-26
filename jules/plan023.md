# Plan 023: Refactor Player and Level Data Structures

## 1. Original Request

The user requested a refactoring of the core data structures for player and level information with the following goals:

1.  In `leveldata`, the `hp` field should be renamed to `maxhp` for better clarity.
2.  The attributes in `playerdata` are redundant with `leveldata`. `playerdata` should only store essential, non-derivable information like `level` and `exp`. The rest of the player's combat stats should be derived from `leveldata` at runtime.

The user also requested that a plan file be created, tests be written, `npm run check` be executed, and all relevant documentation (`jules.md`, `agents.md`, and a report file) be updated.

## 2. Execution Plan

1.  **Refactor Data Files and Types:**
    *   In `gamedata/leveldata.json`, rename the `hp` field to `maxhp` for all level entries.
    *   In `gamedata/playerdata.json`, remove the `maxhp`, `attack`, `defense`, and `speed` fields. Keep `id`, `name`, `level`, `exp`, current `hp`, and `keys`.
    *   Update the `LevelData` interface in `src/data/types.ts` to reflect the change from `hp` to `maxhp`.
    *   Update the `PlayerData` interface in `src/data/types.ts` to remove the redundant stat fields.

2.  **Update State Initialization Logic:**
    *   Modify `GameStateManager.createInitialState` in `src/core/state.ts`.
    *   When creating the player object, fetch the base stats (`maxhp`, `attack`, `defense`, `speed`) from `dataManager.levelData` based on the player's initial level from `playerdata.json`.
    *   Combine the stats from `leveldata` with the data from `playerdata.json` to construct the full `IPlayer` object for the game state.

3.  **Update Level-Up Logic:**
    *   In `src/core/logic.ts`, modify the `applyLevelUp` function.
    *   When a player levels up, ensure it correctly reads `maxhp` (instead of `hp`) from the `LevelData` for the new level and updates the player's stats accordingly.
    *   Ensure the player's `hp` is restored to the new `maxhp` upon leveling up.

4.  **Create a New Test File for Verification:**
    *   Create a new test file `src/core/tests/plan023.test.ts` to specifically test the refactoring.
    *   Test initial state creation to ensure stats are derived correctly.
    *   Test the level-up process to ensure stats are updated correctly from `leveldata`.
    *   Test that monster stat initialization is unaffected.

5.  **Run Checks and Tests:**
    *   Execute `npm run check` to ensure there are no linting or type errors.
    *   Execute `npm test` to run all unit tests and ensure that the changes have not introduced any regressions.

6.  **Update Documentation:**
    *   Create a report file `jules/plan023-report.md` summarizing the changes.
    *   Update `jules.md` to reflect the completion of this task.
