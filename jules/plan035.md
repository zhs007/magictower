1.  **Create New Package `packages/maprender`**:
    *   Create the directory `packages/maprender`.
    *   Create a `package.json` file for the new package, specifying dependencies on `pixi.js` and `@proj-tower/logic-core`.
    *   Create a `tsconfig.json` file for TypeScript compilation.
    *   Update `pnpm-workspace.yaml` to include the new package.
    *   Run `pnpm install` to link the new package within the monorepo.

2.  **Implement the `MapRender` Class**:
    *   Create the file `packages/maprender/src/map-render.ts`.
    *   The `MapRender` class will extend `PIXI.Container`.
    *   It will have two internal child containers: `floorContainer` for floor tiles and `entityContainer` for walls and all other dynamic entities (player, monsters, etc.).
    *   The `entityContainer` will have `sortableChildren = true` to enable z-sorting based on the y-coordinate.
    *   The constructor will accept a `GameState` object.
    *   I will move the logic from `renderer.ts`'s `drawMap` method into a private method within `MapRender`, which will be called during construction. This method will populate the `floorContainer` and add wall sprites to the `entityContainer`, setting their `zIndex` correctly.

3.  **Refactor `Renderer` in `apps/game`**:
    *   Modify `apps/game/src/renderer/renderer.ts`.
    *   Import the new `MapRender` class from `@proj-tower/maprender`.
    *   In the `Renderer` class, remove the old `floorContainer` and `mainContainer`.
    *   In the `Renderer`'s `initialize` method, instantiate the new `MapRender` class using the initial `GameState` and add it to the stage.
    *   Remove the now-obsolete `drawMap` method from `Renderer`.
    *   Update the `syncSprites` method to add and manage entity sprites in the `mapRender.entityContainer` instead of the old `mainContainer`.

4.  **Documentation and Reporting**:
    *   Create a plan file `jules/plan034.md` containing these steps.
    *   After the implementation is complete and verified, I will update the project's main documentation in `jules.md` and `README.md` to describe the new `maprender` package and its usage.
    *   Finally, I will create a report file `jules/plan034-report.md` detailing the work performed, any issues encountered, and the solutions.
