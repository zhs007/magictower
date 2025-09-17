# Leveldata Editor

The Leveldata Editor is a tool for visualizing and editing the `gamedata/leveldata.json` file, which defines the player's progression curve.

## Features

-   **Visual Editing**: Edit level data in a simple, intuitive table.
-   **Chart Visualization**: See the impact of your changes immediately in a line chart that displays key stats (`exp_needed`, `maxhp`, `attack`, `defense`, `speed`) versus level.
-   **Data Expansion/Contraction**: Easily expand the number of levels using a linear growth model or shrink it to a smaller size.
-   **Save to Game Data**: Save your changes directly to `gamedata/leveldata.json`.

## How to Run

1.  Make sure all project dependencies are installed by running `pnpm install` from the root directory.
2.  Start the editor's development server with the following command from the root directory:

    ```bash
    pnpm dev:leveldataeditor
    ```

3.  Open your browser and navigate to the URL provided in the console (usually `http://localhost:5174`).
