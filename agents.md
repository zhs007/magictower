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
