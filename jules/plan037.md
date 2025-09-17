# Plan 027: Leveldata Editor

## 1. Understanding the Goal

The main goal is to create a new tool, the "Leveldata Editor," as a standalone application within the `apps/` directory. This tool will provide a user-friendly, visual interface for editing the `gamedata/leveldata.json` file, which is critical for game balancing.

The editor will be modeled after the existing `mapeditor`, using a similar technology stack (Vite, Fastify, TypeScript) and a client-server architecture. The server will be responsible for all file I/O operations, leveraging the `@proj-tower/logic-core` package to ensure data integrity.

## 2. Key Features

- **Visualize Data:** Display `leveldata.json` in two formats:
    1.  **Tabular View:** An editable grid on the left for precise numerical adjustments to all stats except the level itself.
    2.  **Graphical View:** An ECharts line graph on the right, plotting key statistics (`exp_needed`, `maxhp`, `attack`, `defense`, `speed`) against the `level` to provide an intuitive overview of the player's progression curve.
- **Edit and Save:** Allow users to modify data in the table and save the changes back to `gamedata/leveldata.json`.
- **Data Manipulation:**
    - **Expand Levels:** A feature to programmatically extend the level cap (e.g., from 50 to 100). The new levels will be generated based on the average growth of existing levels, with options for different growth functions (linear, quadratic, etc.).
    - **Shrink Levels:** A feature to reduce the number of levels, deleting the surplus data.

## 3. Task Breakdown

1.  **Project Scaffolding:**
    *   Create the directory structure for `apps/leveldataeditor`.
    *   Initialize a `package.json` file with necessary dependencies like `fastify`, `vite`, `typescript`, `echarts`, and a workspace dependency on `@proj-tower/logic-core`.
    *   Set up `tsconfig.json` and `vite.config.ts` based on the `mapeditor`'s configuration.

2.  **Backend Server (Fastify):**
    *   Create a `src/server.ts` file.
    *   Implement API endpoints:
        *   `GET /api/leveldata`: Reads `gamedata/leveldata.json` using `logic-core`'s data manager and returns the data as JSON.
        *   `POST /api/leveldata`: Receives updated level data in the request body, validates it, and writes it back to `gamedata/leveldata.json`.

3.  **Frontend Development (Client):**
    *   Set up the basic HTML structure in `index.html`.
    *   Create the main application file `src/client/main.ts`.
    *   Implement the UI layout with a left panel for the table and a right panel for the chart.
    *   **Table View:**
        *   Fetch initial data from the `GET /api/leveldata` endpoint.
        *   Render the data in an HTML table.
        *   Make the table cells (except for the 'level' column) editable (`contenteditable`).
        *   Implement a "Save" button that sends the modified data to the `POST /api/leveldata` endpoint.
    *   **Chart View:**
        *   Initialize an ECharts instance in the right panel.
        *   Format the fetched level data to fit the ECharts series structure.
        *   Render the line chart with five series: `exp_needed`, `maxhp`, `attack`, `defense`, `speed`, all with `level` as the x-axis.
        *   Ensure the chart updates automatically after data is saved.

4.  **Advanced Features:**
    *   **Expand Data:**
        *   Add a button "Expand Levels".
        *   On click, show a prompt asking for the new total number of levels and the desired growth function (initially, just "linear" is fine).
        *   Implement the logic to calculate the new level data based on the average growth of the last few existing levels.
        *   Update the UI (table and chart) with the newly generated data.
    *   **Shrink Data:**
        *   Add a button "Shrink Levels".
        *   On click, prompt for the new, smaller number of levels.
        *   Implement the logic to truncate the data array.
        *   Update the UI.

5.  **Testing and Verification**
   - Manually test all features: loading, editing, saving, expanding, and shrinking data.
   - Verify that `gamedata/leveldata.json` is correctly updated after saving.
   - Ensure the chart accurately reflects the data in the table.

6.  **Documentation:**
    *   Create a `README.md` for the `leveldataeditor` application.
    *   Update the root `jules.md` and `README.md` to include information about the new editor, its purpose, and how to run it.
    *   Write the final `jules/plan027-report.md` to summarize the development process.
