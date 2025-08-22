# AGENTS.md for Project Tower

This file provides instructions for AI coding agents working on this project.

## Project Overview

This project is a web-based "Magic Tower" style game developed with Pixi.js and TypeScript. The core gameplay involves exploring a maze, defeating monsters, and collecting items to progress. The game is designed for portrait mode on mobile devices, is deterministic (no randomness), and emphasizes strategic resource management.

A key design principle is the strict separation of game logic from the rendering engine. All game data is defined in external JSON files.

For more details, refer to `jules.md`.

## Development Environment

- **Node.js version**: As specified in the development environment.
- **Package Manager**: `npm`

### Setup Commands

- **Install dependencies**: `npm install`
- **Start the development server**: `npm run dev`

## Testing

This project uses `vitest` for unit testing.

- **Run all tests**: `npm test`
- **Run tests in watch mode**: `npm test -- --watch`

Core logic in `src/core/` should have high test coverage. All new features should be accompanied by corresponding tests.

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
