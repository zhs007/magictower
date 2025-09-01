# Plan 027: Implement Equipment and Item Entities on Maps

## 1. Understanding the Original Request

The user wants to fix an issue where items and equipment on the game maps are not being treated as entities that the player can pick up. Specifically, on `floor_02.json`, there is a blood vial (potion) and a weapon that should be present on the map for the player to collect. The current implementation does not handle this correctly.

My investigation revealed that while `floor_02.json` correctly defines these entities with `type: "item"` and `type: "equipment"`, the game's state initialization logic in `src/core/state.ts` is missing a handler for the `equipment` type. This causes equipment to be ignored during level setup.

## 2. Goal

The goal is to modify the game logic to correctly parse and place item and equipment entities from the map data onto the game map, making them available for player interaction (i.e., pickup).

## 3. Task Decomposition

I have broken down the task into the following steps:

1.  **Create `jules/plan027.md`**: Document the plan for this task.
2.  **Modify `src/core/state.ts`**:
    - Implement a new logic block in the `createInitialState` function to handle entities of type `equipment`.
    - This block will:
        - Fetch the base equipment data using `dataManager.getEquipmentData()`.
        - Create a new equipment object, including its `x` and `y` coordinates from the map data.
        - Add the new equipment object to the `entities` collection for rendering.
        - Add the new equipment object to the `equipments` collection in the `GameState` to make it interactable.
3.  **Add a Test Case**:
    - Create a new test in `src/core/tests/state.test.ts`.
    - This test will simulate loading a map that contains an equipment entity and assert that this entity is correctly added to the `equipments` collection in the resulting game state. This will prevent future regressions.
4.  **Run Tests**:
    - Execute the full test suite (`npm test`) to verify that the changes are correct and do not introduce any regressions.
5.  **Create `jules/plan027-report.md`**:
    - Document the entire process, including the problem analysis, the solution implemented, and the results of the tests.
6.  **Update `jules.md`**:
    - Update the main project documentation to reflect the completion of this task and link to the plan and report.
7.  **Submit**:
    - Request a code review to ensure the quality of the changes.
    - After addressing any feedback, submit the code with a descriptive commit message.
