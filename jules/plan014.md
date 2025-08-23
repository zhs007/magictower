1.  **Setup and Project Configuration:**
    *   Create the plan file `jules/plan014.md`.
    *   Modify image assets to be 65x130. I'll replace `assets/player.png`, `assets/monster/monster.png`, `assets/item/item.png`, and `assets/map/wall.png` with new placeholder versions of the correct size.
    *   Update `gamedata` if necessary to reflect any asset changes.

2.  **Core Logic and Type Definitions:**
    *   Modify `src/core/types.ts`: Add a `direction: 'left' | 'right'` property to the `ICharacter` interface. Initialize it to `'right'`.
    *   Modify `src/core/logic.ts` or `src/core/state.ts`: Update the logic that handles the `MOVE` action to set the player's `direction` property based on `dx`. If `dx > 0`, direction is `'right'`; if `dx < 0`, direction is `'left'`.

3.  **Renderer Refactoring for Z-Ordering:**
    *   Modify `src/renderer/renderer.ts`:
        *   Remove the `entityContainer`.
        *   Create a new main container for all sortable objects (entities and walls), let's call it `mainContainer`. Set `mainContainer.sortableChildren = true`.
        *   Modify `drawMap`:
            *   Floor tiles will be drawn into a `floorContainer` at the bottom.
            *   Wall tiles will be created as sprites and added to the `mainContainer`, with their `zIndex` set to their `y` grid coordinate. They will be 65x130.
        *   Modify `syncSprites`:
            *   Adjust sprite creation:
                *   Set size to 65x130.
                *   Set anchor to `(0.5, 1)` (bottom-center).
                *   Update position calculation. `y` position should be `(entity.y + 1) * TILE_SIZE`.
            *   Set `sprite.zIndex = entity.y` for all entities.
            *   Implement direction flipping: check `entity.direction` and set `sprite.scale.x` to `-1` for `'left'` and `1` for `'right'`.
        *   Refactor animation methods (`animateItemPickup`, `animateAttack`) to work correctly with the new sprite dimensions and anchor points.
        *   Implement the top-layer rendering system. I will add a `topLayerContainer` with `sortableChildren = true` and functions to move sprites between `mainContainer` and `topLayerContainer`.

4.  **Testing:**
    *   Create a new test file `src/renderer/tests/plan014.test.ts`.
    *   Write unit tests to verify:
        *   Sprites have the correct 65x130 size and bottom-center anchor.
        *   `zIndex` is correctly set to the entity's `y` coordinate.
        *   Sprites are correctly flipped based on the `direction` property.
        *   Walls are rendered correctly and participate in z-sorting.
        *   An entity with a higher `y` coordinate (lower on the screen) renders on top of an entity with a lower `y` coordinate.
    *   Run all existing tests (`npm test`) to ensure no regressions were introduced.

5.  **Documentation and Cleanup:**
    *   Update `jules.md`:
        *   Add the new asset rules (65x130, bottom-center alignment, right-facing default) to a new "Assets" section.
        *   Update the "Current Development Status" section to mark `plan014` as completed.
    *   Update `agents.md` if any new development practices were introduced (unlikely for this task, but I will check).
    *   Create the final report `jules/plan014-report.md`.

6.  **Submission:**
    *   Once all tests pass and documentation is updated, submit the changes.
