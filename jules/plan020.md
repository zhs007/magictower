# Plan for Map Generator (plan020)

This plan outlines the steps to create a procedural map generator tool as requested.

1.  **Create the Map Generator Script**
    *   Create a new file `scripts/gen-map.ts` to house the map generation logic.
    *   This script will be a command-line tool for generating map layout data.

2.  **Implement the Core Map Generation Logic**
    *   **Grid Initialization**: Create a 2D array representing the map grid, with dimensions specified by `Width` and `Height`.
    *   **Partitioning Algorithm**: Implement a recursive binary splitting algorithm to partition the map into `AreaNum` regions.
        *   This algorithm will recursively divide the map space either horizontally or vertically.
        *   It must handle the `minAreaSize` constraint, ensuring no generated area is smaller than its specified minimum dimensions.
        *   It must also handle the `mapAreaPos` constraint, ensuring specified coordinates are located within the correct areas.
    *   **Wall and Door Placement**:
        *   Place walls along the boundaries of the generated areas.
        *   Place doors (floor tiles) on walls between areas as specified by the `LinkData` parameter. The outermost border of the map will always be walls.

3.  **Implement Parameter Handling and Output**
    *   The script will accept the following parameters: `Width`, `Height`, `AreaNum`, `LinkData`, `minAreaSize`, `mapAreaPos`, and `outputFilename`.
    *   For initial development, these can be hardcoded. Later, I will add command-line argument parsing if needed.
    *   The final output will be a JSON file with a `layout` field, matching the format of existing maps in `mapdata/`.

4.  **Create Tests for the Map Generator**
    *   Create a new test file `scripts/gen-map.test.ts`.
    *   Write comprehensive unit tests using `vitest`.
    *   Tests will cover:
        *   Correct map dimensions.
        *   Presence of border walls.
        *   Correct number of areas.
        *   Validation of `minAreaSize` and `mapAreaPos` constraints.
        *   Correct door placement according to `LinkData`.
        *   Edge cases (e.g., complex layouts, minimal dimensions).

5.  **Documentation and Reporting**
    *   Update `jules.md` with instructions on how to use the map generator script.
    *   Update the "Current Development Status" section in `jules.md` to include this task.
    *   Create a final report in `jules/plan020-report.md` summarizing the work done.

6.  **Review and Update `agents.md`**
    *   If any new conventions or tools were introduced, update `agents.md` accordingly. Given this is a script, it might warrant a new section if it's intended for regular use by other developers/agents.
