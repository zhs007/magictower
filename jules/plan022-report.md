# Task Report: Plan 022 - Map Generator v2

## 1. Task Summary

This task involved creating a new, template-based map generator (v2). The project went through several major iterations based on user feedback, evolving from a simple generator into a sophisticated tool for creating "layout maps" intended for a two-stage design process.

## 2. Final Work Completed

The final version of the generator includes the following features and logic:

### a. Core Philosophy: Layout Map Generation

-   **Two-Stage Design**: The tool's final purpose is to generate a "layout map", not a finished map. It produces a grid with rooms and a maximum number of potential connection points.
-   **Preserved Door Candidates (`-2`)**: The generator's main output is a layout where all non-outer-wall potential doors (`-2`) are preserved. This allows a level designer to later decide which doors to open and which to seal, completing the map in a second stage. The previous `doorDensity` logic was removed.

### b. Algorithm and Placement Logic

-   **External Template Library (`genmap2-templates.json`)**: All room templates are defined in an external JSON file for easy editing. Templates were updated to have potential doors on all four sides to maximize connectivity.
-   **Constraint-Driven Generation**: The generation process is driven by an array of `templateData` constraints. For each constraint, the algorithm filters the template library by size and `roomNum`, and then attempts to place one matching template.
-   **Strict Placement Rules**: To ensure high-quality layouts, several strict rules were implemented for a placement to be considered valid:
    1.  **No Adjacent Walls**: Prevents placing templates where a new wall would be created right next to an existing one.
    2.  **Minimum Wall Overlap**: Requires that the number of overlapping wall/door tiles between a template and the map is greater than 40% of the template's total wall/door tiles. This ensures rooms are well-connected.
    3.  **Wall Counting**: The wall counting logic for the overlap rule was fixed to correctly include door candidates (`-2`) as functional walls.
    4.  **Door Placement**: The logic for placing door candidates was simplified to ensure they correctly overwrite existing walls and are preserved for the final layout.

### c. Technical and Usability Fixes

-   **JSON Output Formatting**: After a lengthy debugging process, a custom JSON formatting function was implemented to ensure the output `layout` array is formatted with each map row on a single line, as specifically requested for human readability.
-   **Script Stability**: A low-level, un-catchable error in the runner script was traced to an unstable file path resolution method and fixed by adopting the standard `fileURLToPath` API for ES Modules.
-   **Command-Line Warnings**: The `ExperimentalWarning` from Node.js when running the script was suppressed by updating the `npm` script command in `package.json`.

### d. Testing

-   A full suite of unit tests was created and maintained throughout the iterative development process. Tests were updated to reflect the final "layout map" logic, including removing obsolete tests and adding new ones to verify that door candidates (`-2`) are preserved in the output.

## 3. Conclusion

The Map Generator v2 is now a robust and flexible tool that successfully fulfills the user's final design requirements. It has been through multiple major revisions, each incorporating detailed feedback to significantly improve the output quality and align with the intended design workflow. All known bugs have been addressed, and the documentation has been updated to reflect the final state of the tool.
