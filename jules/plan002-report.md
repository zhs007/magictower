# Plan 002: Core Game Logic and State Management - Completion Report

## Summary

This report details the successful execution of Plan 002, which focused on establishing the core game logic and state management systems. The primary goal was to create a robust, independent logic layer without any rendering or UI dependencies, verified entirely through unit tests.

## Work Completed

1.  **Core Type Definitions (`src/core/types.ts`)**:
    - All necessary interfaces (`IPlayer`, `IMonster`, `IItem`, `Tile`, `GameState`) and enums (`EntityType`) were defined.
    - An `Action` type was created to support a Redux-like state management pattern.

2.  **State Manager (`src/core/state.ts`)**:
    - A `GameStateManager` class was implemented to handle the game's state.
    - It provides methods to initialize (`initializeState`), access (`getState`), and update (`dispatch`) the game state.
    - The `dispatch` method acts as a central hub for all state-mutating actions.

3.  **Game Logic (`src/core/logic.ts`)**:
    - **Movement**: `handleMove` function was implemented to manage player movement, including boundary checks.
    - **Combat**: `calculateBattleOutcome` was created as a pure function to determine the results of a battle between the player and a monster. Initial bugs related to infinite loops and incorrect damage calculation were identified and fixed.
    - **Items**: `handlePickupItem` logic was added to allow the player to pick up items like potions.
    - **Doors**: `handleOpenDoor` logic was implemented for opening doors.

4.  **Unit Testing (`src/core/tests/logic.test.ts`)**:
    - A comprehensive suite of unit tests was written using `vitest`.
    - Tests cover:
        - Combat scenarios (player wins, player loses, zero-damage cases).
        - Player movement (valid moves, out-of-bounds).
        - Item interactions (potion pickup).
        - Door mechanics.
    - All tests are passing, ensuring the reliability of the core logic.

5.  **Dependency Management**:
    - Added `lodash` and `@types/lodash` to `package.json` to support deep cloning of game state, ensuring immutability.

## Issues Encountered and Resolutions

-   **Initial Test Failure**: A `ReferenceError` for `beforeEach` was resolved by adding the correct import from `vitest`.
-   **Test Timeout (Infinite Loop)**: The test runner was timing out. This was traced back to an infinite loop in the `calculateBattleOutcome` function when the player's attack was insufficient to damage a monster. The loop was fixed by adding a break condition for such cases.
-   **Incorrect Test Assertion**: A failed test for battle outcomes revealed a bug in the `monsterHpLoss` calculation, where damage could exceed the monster's total HP. This was corrected by capping the HP loss at the monster's initial health.

## Final Status

All objectives outlined in Plan 002 have been met. The `src/core` directory now contains a fully functional, tested, and independent game logic layer. The codebase is stable and ready for the next phase of development (e.g., data management, rendering).
