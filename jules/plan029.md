# Plan 029: Refactor to pnpm + Turborepo Monorepo

## 1. Goal

The primary objective is to refactor the project from a single-package `npm` structure to a modern, efficient monorepo using `pnpm` and `Turborepo`. This will improve maintainability, scalability, and build performance.

The main deliverables are:
- A `pnpm`-based monorepo.
- A `Turborepo` pipeline for managing tasks.
- A new `logic-core` package containing the game's core business logic.
- The main game application, refactored to depend on `logic-core`.
- Updated documentation reflecting the new structure.

## 2. Task Breakdown

### Phase 1: Initial Setup & Migration to pnpm/Turborepo

1.  **Initialize Workspace**:
    - Create `pnpm-workspace.yaml` at the root to define the monorepo structure.
    - Create a basic `turbo.json` file.
    - Modify the root `package.json` to be a private workspace (`"private": true`).
    - Remove the `package-lock.json` file.

### Phase 2: Restructure Project into a Monorepo

2.  **Create `packages` Directory**: This will house all the individual packages (`game` and `logic-core`).
3.  **Move Game into `packages/game`**:
    - Create the `packages/game` directory.
    - Move all relevant application source files and assets into `packages/game`. This includes: `src/`, `assets/`, `gamedata/`, `mapdata/`, `public/`, `index.html`, `vite.config.ts`.
    - Create a new `packages/game/package.json` and move all dependencies (`dependencies`, `devDependencies`) and scripts from the original root `package.json` into it.
    - Create a `packages/game/tsconfig.json` by moving and adapting the root `tsconfig.json`.
4.  **Create `packages/logic-core`**:
    - Create the `packages/logic-core` directory.
    - Initialize a `package.json` for this new library.
    - Create a `tsconfig.json` for `logic-core` configured for building a library.

### Phase 3: Extract and Refactor Logic

5.  **Move Core Logic Files**:
    - Move `src/core/logic.ts` from `packages/game` to `packages/logic-core/src/`.
    - Carefully analyze and move all related types, state definitions, and helper functions from `packages/game/src/core/` to `packages/logic-core/src/`.
    - Move the corresponding unit tests (e.g., `logic.test.ts`) to `packages/logic-core/src/tests/`.
6.  **Refactor `logic-core` Package**:
    - Create a main entry point (`src/index.ts`) in `logic-core` that exports the public API (functions, types).
    - Configure its `package.json` with the correct `main`, `module`, and `types` fields to ensure it's a proper package.
    - Add a `build` script to compile the TypeScript code.
7.  **Refactor `game` Package**:
    - Add `logic-core` as a workspace dependency in `packages/game/package.json` (`"logic-core": "workspace:*"`).
    - Update all imports in the `game` package to reference `"logic-core"` instead of local files.

### Phase 4: Configure and Verify

8.  **Configure Turborepo Pipeline**:
    - In `turbo.json`, define the dependency graph and caching rules for all common tasks (`build`, `test`, `lint`, `dev`).
9.  **Update Root `package.json`**:
    - Move all executable scripts (`dev`, `build`, `test`, etc.) to the root `package.json`.
    - Modify these scripts to use `turbo run <task>`. For example: `"dev": "turbo run dev"`.
10. **Installation and Verification**:
    - Run `pnpm install` in the root directory to install all dependencies and link the workspace packages.
    - Run `turbo run test --parallel` to ensure all tests in both packages pass.
    - Run `turbo run build` to confirm that both packages can be built successfully.
    - Run `turbo run dev` and perform a manual check to ensure the game is fully functional in the browser.

### Phase 5: Documentation

11. **Create Task Report**: Write `jules/plan029-report.md` detailing the execution process, challenges encountered, and solutions.
12. **Update `jules.md`**: Revise the main development document to explain the new monorepo architecture, the `logic-core` package, and the `pnpm`/`Turborepo` workflow.
13. **Update `agents.md`**: Update the agent instructions with the new setup and development commands.
