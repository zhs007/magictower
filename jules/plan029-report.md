# Task Report: Plan 029 - Monorepo Refactoring

## 1. Task Summary

The objective of this task was to perform a major refactoring of the project. The key goals were:
-   Migrate the project from `npm` to `pnpm` and `Turborepo`.
-   Convert the project into a monorepo structure.
-   Extract the core game logic into a separate, reusable package named `logic-core`.
-   Ensure the main game application (`game`) depends on `logic-core`.
-   Update all build, test, and development scripts to be managed by Turborepo.

## 2. Execution Process

The refactoring was executed in several phases:

### Phase 1: Workspace Initialization
-   Initialized a `pnpm` workspace by creating a `pnpm-workspace.yaml` file.
-   Set up `Turborepo` by creating a `turbo.json` configuration file.
-   Modified the root `package.json` to define it as a private workspace root, added the `turbo` dependency, and specified the `packageManager`.
-   Removed the old `package-lock.json`.

### Phase 2: Project Restructuring
-   Created a `packages` directory to house the monorepo's packages.
-   Moved the entire game application (source code, assets, config files) into a new `packages/game` directory.
-   Created a new, empty `packages/logic-core` directory for the extracted logic.
-   Created `package.json` and `tsconfig.json` files for both new packages, populating the `game` package's files with the original project's scripts and dependencies.

### Phase 3: Logic Extraction and Refactoring
-   This was the most complex phase of the project.
-   **Initial Move**: I moved what I initially identified as the core logic files (e.g., `logic.ts`, `state.ts`, `types.ts`) from `game` to `logic-core`.
-   **Architectural Challenge**: The first build attempt revealed a critical design issue: the "logic" files were not pure. They contained direct dependencies on the `game` package's data loaders (`dataManager`) and side-effect managers (`audioManager`, `eventManager`). This violated the primary goal of creating a decoupled `logic-core` library.
-   **Solution - Purification**: To resolve this, I made a key architectural decision:
    -   `logic-core` must **only** contain pure functions and type definitions.
    -   State management and side effects are the responsibility of the application layer (`game` package).
    -   Consequently, I moved `GameStateManager` and `SaveManager` back to the `game` package, as they are state containers, not pure logic.
    -   I refactored all the functions remaining in `logic-core` (e.g., `handleEndBattle`, `handleUsePotion`) to remove all direct calls to singletons and instead receive the necessary data (like `levelData` or `potionData`) as function arguments.
-   **Import Fixing**: This architectural change required a thorough update of all `import` statements across both packages to reflect the new structure and dependencies.

### Phase 4: Verification
-   After extensive refactoring, I ran `pnpm install` to link the workspace packages.
-   I ran `pnpm build` and `pnpm test` iteratively, fixing build errors and test failures as they arose. This involved correcting dozens of import paths and updating function calls in the test files to match the new, pure function signatures.
-   After multiple iterations, all builds and tests passed successfully.
-   Finally, I started the development server with `pnpm dev` and requested user verification to confirm the application was running correctly. The user confirmed it was working.

## 3. Challenges and Solutions

-   **Challenge**: `turbo` command not found.
    -   **Solution**: Realized `turbo` was not a global command in the environment. The `turbo` package needed to be added as a `devDependency` to the root `package.json` and run via `pnpm` scripts.

-   **Challenge**: Turborepo schema changes.
    -   **Solution**: The installed version of `turbo` used the newer `tasks` keyword instead of `pipeline` in its `turbo.json` configuration. The error message was clear, and I updated the configuration file accordingly.

-   **Challenge**: Circular dependencies and impure logic in `logic-core`.
    -   **Solution**: This was the main architectural challenge. The solution was to strictly enforce the separation of concerns. I moved stateful classes (`GameStateManager`, `SaveManager`) back to the `game` package and refactored the functions in `logic-core` to be pure, receiving all necessary data as parameters. This resulted in a much cleaner and more maintainable architecture.

-   **Challenge**: Numerous broken imports in old test files.
    -   **Solution**: Patiently went through each failing test file, identified the incorrect import paths, and updated them to either point to local files within the `game` package or to the new `@proj-tower/logic-core` package.

## 4. Final Outcome

The refactoring was successful. The project is now a modern `pnpm` + `Turborepo` monorepo with a clean separation between the pure game logic (`logic-core`) and the game application/engine (`game`). This structure will make future development, testing, and maintenance significantly easier.
