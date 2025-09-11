# Plan 028 Report: Restructure Project - Move Game Package

## 1. Summary of Work

This task focused on restructuring the project's monorepo layout to better separate concerns. The primary action was moving the `game` application from the `packages` directory into a new `apps` directory. This leaves the `packages` directory to be used for shared libraries like `logic-core`.

## 2. Execution Process

1.  **Planning**: A detailed plan was created in `jules/plan028.md` to outline the necessary steps.

2.  **Directory Restructuring**:
    *   A new `apps` directory was created at the root of the repository.
    *   The `packages/game` directory was moved to `apps/game`.

3.  **Configuration Updates**: After moving the directory, several configuration files had to be updated to reflect the new path:
    *   `pnpm-workspace.yaml`: Updated to include `apps/*` in the workspace definition, allowing `pnpm` to find the moved package.
    *   `apps/game/tsconfig.json`: The `paths` and `references` to `logic-core` were updated from `../logic-core` to `../../packages/logic-core` to correct the module resolution.
    *   `agents.md`: Documentation was updated to reflect the new location of the `game` package.
    *   A comment in `apps/game/src/core/audio-manager.ts` was updated to reflect the new path.

4.  **Verification**:
    *   `pnpm install` was run to refresh the dependencies and ensure the workspace was correctly configured.
    *   The full test suite (`pnpm test`) was executed. Initially, the tests for the `game` package failed due to the incorrect paths in its `tsconfig.json`. After correcting the paths, all tests passed, confirming that the restructuring was successful and did not introduce any regressions.

## 3. Challenges and Solutions

The main challenge was a test failure after the initial file move. The error message `ENOENT: no such file or directory, open '/app/apps/logic-core/tsconfig.json'` clearly indicated that the `game` package was looking for `logic-core` in the wrong place.

The solution was to inspect the `apps/game/tsconfig.json` file and correct the relative paths for both the `paths` alias and the `references` field. Once these paths were updated to point to `../../packages/logic-core`, the tests passed.

## 4. Final Outcome

The project structure has been successfully updated. The `game` application now resides in the `apps` directory, and all related configurations have been adjusted accordingly. The project is in a fully working state.
