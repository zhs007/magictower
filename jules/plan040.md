# Plan 040: Refactor to CharacterEntity

## 1. Goal

The primary goal of this plan is to refactor the project to introduce a `CharacterEntity` class. This class will encapsulate the rendering logic and actions specific to characters like the player and monsters. This aligns with the project's principle of separating concerns, moving entity-specific view logic out of the main `Renderer` and into the entity classes themselves.

## 2. Task Breakdown

### Step 1: Create the `CharacterEntity` Class

-   **Location**: `packages/maprender/src/character-entity.ts`
-   **Details**:
    -   Create a new file for the `CharacterEntity` class.
    -   The class will extend `Entity` from `./entity.ts`.
    -   It will have a `direction` property (e.g., `'left' | 'right'`).
    -   It will manage its own `PIXI.Sprite` internally. The constructor will accept a texture to create this sprite.
    -   It will have a method, `setDirection(direction)`, which updates the `direction` property and flips the internal sprite's `scale.x`.
    -   Export the new class from `packages/maprender/src/index.ts`.

### Step 2: Add Actions to `CharacterEntity`

-   **Location**: `packages/maprender/src/character-entity.ts`
-   **Details**:
    -   Add `gsap` as a dependency to the `packages/maprender/package.json`.
    -   Implement an `attack(targetEntity, onComplete)` method. This method will contain the GSAP animation logic currently found in `renderer.ts`'s `animateAttack`.
    -   Implement a `pickup(itemEntity, onComplete)` method. This method will contain the GSAP animation logic for picking up items, currently in `renderer.ts`'s `animateItemPickup`.
    -   These methods will likely trigger actions on the entity (e.g., `this.action = 'attack'`) and use the `setAction` mechanism to perform the animation.

### Step 3: Refactor the Main `Renderer`

-   **Location**: `apps/game/src/renderer/renderer.ts`
-   **Details**:
    -   Change the `entitySprites` map from `Map<string, Sprite>` to `Map<string, Entity>`.
    -   In `syncSprites`, instead of creating `new Sprite()`, create `new CharacterEntity()` for players and monsters. For other entities (items, stairs), continue creating generic `Entity` or `Sprite` objects as appropriate.
    -   Add the newly created `CharacterEntity` instances to the `MapRender` using `mapRender.addEntity()`.
    -   Update the position and `zIndex` of the `CharacterEntity` itself, not its internal sprite.
    -   Call the new `setDirection` method on the `CharacterEntity` instead of manually setting `sprite.scale.x`.

### Step 4: Update `Renderer` to Use `CharacterEntity` Actions

-   **Location**: `apps/game/src/renderer/renderer.ts`
-   **Details**:
    -   Remove the `animateAttack` method from `renderer.ts`. The game logic (likely in `GameScene`) that calls this will now retrieve the `CharacterEntity` instances from the renderer's map and call the `attack` method directly on the attacker entity.
    -   Remove the `animateItemPickup` method from `renderer.ts`. The game logic will similarly call the `pickup` method on the player's `CharacterEntity`.
    -   This will significantly simplify the `Renderer` class.

### Step 5: Testing and Verification

-   **Details**:
    -   Run all existing tests to ensure no regressions have been introduced.
    -   Manually run the game to visually verify that:
        -   Player and monsters render correctly.
        -   Player and monsters change direction correctly.
        -   Attack animations play correctly.
        -   Item pickup animations play correctly.

### Step 6: Documentation and Reporting

-   **Details**:
    -   Create the final report `jules/plan040-report.md`.
    -   Update `jules.md` to document the new `CharacterEntity` class and its role in the architecture.
    -   Review and update `agents.md` if the changes are significant for future agent work.
