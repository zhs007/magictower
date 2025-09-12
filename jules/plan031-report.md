# Plan 031 Report: Move Data Manager to Logic Core

## 1. Task Summary

The goal of this task was to continue the project restructuring by moving the `DataManager` from the `apps/game` package to the `packages/logic-core` package. This aligns with the project's architectural goal of separating pure game logic from the rendering and application layers.

## 2. Execution Analysis

The process was more complex than a simple file move due to the dependencies and differing configurations of the two packages.

### 2.1. Initial File Move

-   Moved `apps/game/src/data/data-manager.ts` to `packages/logic-core/src/data-manager.ts`.
-   Moved the corresponding test file `apps/game/src/data/tests/data-manager.test.ts` to `packages/logic-core/src/tests/data-manager.test.ts`.

### 2.2. Dependency and Import Updates

-   I used `grep` to find all files that imported `dataManager`.
-   The `dataManager` was not exported from `packages/logic-core`, so I updated `packages/logic-core/src/index.ts` to include `export * from './data-manager';`.
-   I then updated all import statements in the `apps/game` package to import `dataManager` from `@proj-tower/logic-core`.
-   This included updating several test files that used `vi.mock` to mock the `dataManager`. The mocks were updated to target `@proj-tower/logic-core`.

### 2.3. Test and Build Failures

Running the test suite revealed several issues:

1.  **Missing `vitest` import**: The moved test file `data-manager.test.ts` was missing an import for `describe`, `it`, etc. This was a simple fix.
2.  **Incorrect file paths**: `dataManager` loads game data JSON files using relative paths. After moving the file, these paths were incorrect. I updated the paths to be relative to the new location in `packages/logic-core/src`.
3.  **TypeScript Build Errors**: This was the most significant challenge. `packages/logic-core` has a stricter `tsconfig.json` than `apps/game`.
    -   **Type Mismatches**: `data-manager.ts` was using type names like `MonsterData` which were not defined in `logic-core`. I had to update all type annotations to use the `I-` prefixed interfaces from `logic-core` (e.g., `IMonster`). I also had to define the `MapLayout` interface, as it was not present in `logic-core`.
    -   **`import.meta.glob`**: `dataManager` uses `import.meta.glob` to load data files. This is a Vite-specific feature. The `logic-core` package is intended to be framework-agnostic, so its `tsconfig.json` did not include the necessary `"vite/client"` type definitions. To resolve the build error, I added `"vite/client"` to the `types` array in `packages/logic-core/tsconfig.json`.

## 3. Technical Debt Introduced

By adding `"vite/client"` to the `tsconfig.json` of `packages/logic-core`, I have introduced a dependency on Vite into what should be a pure, framework-agnostic library. This violates the architectural principles of the project.

**Recommendation for future work**: The data loading mechanism should be refactored. `logic-core` should not be responsible for loading files from the file system. Instead, the application layer (`apps/game`) should be responsible for loading the data and passing it to a method in `logic-core`, perhaps during an initialization step.

## 4. Final Outcome

After resolving the build issues, all tests passed. The `dataManager` is now successfully located in the `logic-core` package, and the application is in a working state. The primary goal of the task has been achieved.
