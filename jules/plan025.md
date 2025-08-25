# Plan 025: Refactor Player State Initialization

This plan details the process of refactoring the game's state initialization logic to remove data redundancy, as suggested by the user. This will make the codebase more robust and maintainable.

## 1. The Problem

Currently, the player's initial stats (HP, attack, defense, etc.) are defined in two places:
1.  `gamedata/playerdata.json`
2.  The Level 1 entry in `gamedata/leveldata.json`

This data duplication is undesirable and has already been a source of inconsistency.

## 2. The Solution

The proposed solution is to make `leveldata.json` the single source of truth for all level-based stats. The game will be refactored to initialize the player's stats based on their starting level.

## 3. Implementation Steps

1.  **Modify `playerdata.json`:**
    -   Remove the redundant stat fields: `hp`, `maxhp`, `attack`, `defense`, and `speed`.
    -   The file will now only contain essential starting data like `level`, `exp`, and `keys`.

2.  **Refactor `createInitialState` in `src/core/state.ts`:**
    -   The logic will be changed to first read `playerdata.json` to determine the player's starting `level`.
    -   It will then look up this level in the data from `leveldata.json`.
    -   The player object will be constructed using the stats from the correct `leveldata` entry.

3.  **Verification:**
    -   The entire test suite (`npm test`) will be run. The existing tests, particularly the `balance.test.ts` suite, are comprehensive enough to validate that the player is initialized with the correct stats. A successful test run will confirm the refactoring was successful.

4.  **Finalize and Submit:**
    -   Create a report file (`plan025-report.md`).
    -   Update the main project document (`jules.md`).
    -   Submit the final, refactored code.
