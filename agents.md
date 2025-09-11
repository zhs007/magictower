# AGENTS.md for Project Tower

This file provides instructions for AI coding agents working on this project.

## Project Overview

This project is a web-based "Magic Tower" style game developed with Pixi.js and TypeScript. The project is structured as a **monorepo** using `pnpm` and `Turborepo` to manage two separate packages:
-   `packages/game`: The main game application, including the renderer, state management, and assets.
-   `packages/logic-core`: A pure, framework-agnostic library containing all the core game rules and type definitions.

This separation ensures the core logic is highly portable and testable in isolation. For more details on the architecture, refer to `jules.md`.

## Development Environment

- **Node.js version**: As specified in the development environment.
- **Package Manager**: `pnpm`
- **Monorepo Tool**: `Turborepo`

### Setup Commands

All commands should be run from the **root** of the repository.

- **Install dependencies**: `pnpm install`
- **Start the development server**: `pnpm dev`
- **Build all packages**: `pnpm build`

## Testing

This project uses `vitest` for unit testing. All test commands should be run from the root directory.

- **Run all tests**: `pnpm test`
- **Run tests in watch mode**: `pnpm test -- --watch`

The `logic-core` package should have high test coverage. All new features in `logic-core` must be accompanied by corresponding tests.

## Utility Scripts

For tasks that should be run from the command line (e.g., data generation, build tools), create a TypeScript file in the `scripts/` directory.

- **Execution**: To run a script, use the `ts-node` package, which is included in `devDependencies`. The recommended way to run a script in this project's ES Module context is by using the `ts-node/esm` loader. Add a command to the `scripts` section of `package.json`:
  ```json
  "scripts": {
    "my-script": "node --loader ts-node/esm scripts/my-script.ts"
  }
  ```

- **Testability**: To ensure that utility scripts can be unit-tested without issues, keep the script file itself free of side effects. All core logic should be in exported functions. Create a separate "runner" script (e.g., `scripts/run-my-script.ts`) that imports the main function and calls it. The `npm` script should then execute this runner file. This pattern prevents module loading issues with `vitest`.

## Code Style

- **Language**: TypeScript
- **Linter**: ESLint
- **Formatter**: Prettier
- **Key conventions**:
    - Follow the existing code style.
    - Use full type definitions for all variables and functions.
    - Add JSDoc comments for complex logic, public functions, and classes.
    - Ensure code is modular and follows the principle of separation of concerns (e.g., logic vs. rendering).

## How to Work with this Repository

- **Development Plans**: All development tasks are guided by plan files located in the `jules/` directory. Each plan corresponds to a specific feature or development phase.
- **Reporting**: After completing a plan, create a corresponding `-report.md` file in the `jules/` directory, summarizing the work done.
- **Updating Status**: Update `jules.md` to reflect the current development status after a plan is completed.

## Agent Activity Log

This section logs significant actions taken by AI agents.

- **2025-08-21 (Jules)**: Executed `plan007`. Implemented the action-based save/load system, created a `SaveManager`, and extended `GameStateManager` to support action history. Wrote a full suite of unit tests for the new functionality and fixed a regression in existing tests. Created `plan007-report.md` and updated `jules.md`.
- **2025-08-21 (Jules)**: Executed `plan011`. This included implementing the UI layout and resolution scaling, which required a major refactoring of the renderer and game state logic. Updated the map to 16x16, added placeholder assets, and wrote a comprehensive set of tests to ensure all changes were working correctly. Created `plan011-report.md` and updated `jules.md` to reflect the new project status.
- **2025-08-21 (Jules)**: Created design document `jules/plan011.md` for UI and resolution scaling. Updated `jules.md` to reflect the new plan and confirmed `plan005` as the next implementation task.
