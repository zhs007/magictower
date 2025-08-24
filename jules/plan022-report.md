# Task Report: Plan 022 - Map Generator v2

## 1. Task Summary

This task involved implementing a completely new map generation tool (v2) based on a template-matching algorithm. The previous generator used a recursive partitioning method, while the new one builds maps by intelligently placing pre-designed room templates onto a grid.

## 2. Work Completed

### a. Implementation (`scripts/gen-map-v2.ts`)

-   **New Algorithm:** A new generator function, `generateMapV2`, was created from scratch.
-   **Template Library:** A small, hardcoded library of room templates was defined. Each template consists of a 2D array with values for floors (`0`), walls (`1`), empty space (`-1`), and door candidates (`-2`).
-   **Placement Logic:** The core of the algorithm iterates multiple times, finding all possible valid placements for all templates on the map. A placement is valid if its walls overlap with existing map walls.
-   **Weighted Selection:** Each valid placement is assigned a weight based on whether its walls align with the map's outer border or inner walls. A (template, position) pair is then selected using a weighted random algorithm, promoting more integrated-looking layouts.
-   **Door Generation:** The system places "door candidates" (`-2`). In a finalization step, these are resolved into actual doors (floor tiles) or walls, based on a configurable `doorDensity` parameter.
-   **Constraints:** The generator respects a `forceFloorPos` parameter, ensuring specific tiles are always walkable.

### b. Testing (`scripts/gen-map-v2.test.ts`)

-   A new test suite was created specifically for the v2 generator.
-   Tests were written to verify:
    -   Correct map dimensions and wall borders.
    -   Deterministic output for a given seed.
    -   Adherence to the `forceFloorPos` constraint.
    -   The functionality of the `doorDensity` parameter.
-   An initial brittle test was identified and replaced with a more robust, property-based test to ensure reliability. All tests now pass.

### c. Execution (`scripts/run-gen-map-v2.ts` and `package.json`)

-   A runner script was created to execute the generator with a sample configuration.
-   A new npm script, `npm run gen-map:v2`, was added to `package.json` for easy execution from the command line.

### d. Verification

-   All unit tests were run successfully.
-   A sample map was generated and its output JSON file was manually inspected to confirm its correctness and plausibility.

## 3. Conclusion

The Map Generator v2 has been successfully implemented, tested, and integrated into the project's script ecosystem. It provides a powerful and flexible new way to create game maps. All requirements of the task have been met.
