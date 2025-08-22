1. **Create `jules/plan012.md`**
   - Create the plan file to document the task.

2. **Refactor the Renderer for Persistent Sprites and Animation**
   - Modify `src/renderer/renderer.ts` to create and manage persistent sprites for the player, monsters, and items, instead of recreating them on every frame. This is a necessary prerequisite for animations.
   - Add an animation library (like `gsap`) to handle tweening and animations.
   - Implement a `syncWithState` method in the renderer that updates the properties of the persistent sprites based on the game state. This will be called in the game loop.

3. **Introduce an Interaction State**
   - In `src/core/types.ts`, add a new property to `GameState` called `interactionState` which can be one of `'none'`, `'item_pickup'`, or `'battle'`. This will control the game loop's behavior.
   - The state will also store relevant data for the interaction, e.g., the target item or monster.

4. **Implement Item Pickup Logic and Animation**
   - In `src/core/logic.ts`, modify `handleMove` to detect when a player is about to pick up an item.
   - When an item is targeted, change the `interactionState` to `'item_pickup'` and store the item's ID.
   - In `src/scenes/game-scene.ts`, when `interactionState` is `'item_pickup'`, trigger an animation sequence in the renderer:
     - Player jumps to the item's square.
     - The item animates up, shrinks, and fades out.
   - Once the animation is complete, call `handlePickupItem` to update the game state, and set `interactionState` back to `'none'`.

5. **Implement Combat Logic and Animation**
   - In `src/core/logic.ts`, refactor the combat logic. Instead of `calculateBattleOutcome`, create a turn-based combat system.
   - When a player moves into a monster, set `interactionState` to `'battle'` and store the monster's ID.
   - In `src/scenes/game-scene.ts`, when `interactionState` is `'battle'`, start a turn-based combat loop.
   - For each turn, determine the attacker and trigger an attack animation in the renderer:
     - Attacker hops towards the defender.
     - A damage number floats up from the defender.
     - Attacker returns to its position.
   - After each attack, update the HP of the characters in the game state.
   - Combat ends when one character's HP is 0. Update the game state accordingly (e.g., remove the monster) and set `interactionState` back to `'none'`.

6. **Write Tests**
   - Create new test files for the new logic.
   - Write unit tests for the turn-based combat logic in `src/core/logic.test.ts`.
   - Write tests for the item pickup logic.
   - Since the animations are visual, I will manually verify them during development and testing.

7. **Update Documentation**
   - Create `jules/plan012-report.md` to summarize the changes.
   - Update `jules.md` with the current development status and suggest the next task.
   - Update `agents.md` if any of the development processes or conventions have changed.

8. **Final Review and Submission**
   - Run all tests to ensure everything is working correctly.
   - Request a code review.
   - Submit the changes.
