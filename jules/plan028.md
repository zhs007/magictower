# Plan 028: Restructure Project - Move Game Package

## 1. Objective

The goal of this task is to restructure the project by moving the `game` package from the `packages` directory to a new `apps` directory. This change improves the project's organization by separating application-specific packages from shared libraries.

## 2. Task Decomposition

1.  **Create a new plan file.**
   - Create `jules/plan028.md` to document the process for this task.

2.  **Restructure the project.**
   - Create a new directory named `apps`.
   - Move the `packages/game` directory into the new `apps` directory, renaming it to `apps/game`.

3.  **Update configuration files.**
   - Perform a global search for the string `packages/game` to identify all files that need updating.
   - Update `pnpm-workspace.yaml`, `turbo.json`, and potentially `package.json` files or `tsconfig.json` files that reference the old path.

4.  **Verify the changes.**
   - Run `pnpm install` to ensure all dependencies are correctly linked after the file moves.
   - Run the test suite using `pnpm test` to confirm that the application is still functioning correctly.

5.  **Generate a report.**
   - Once the task is complete and verified, create a report named `jules/plan028-report.md`.

6.  **Update documentation.**
   - Update `jules.md` to reflect the new `apps` directory structure.
   - Review `agents.md` and update it if necessary.
   - Update `README.md` to align it with the current monorepo structure.
