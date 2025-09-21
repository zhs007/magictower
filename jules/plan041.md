# Plan 041: Create Monster Editor

## 1. Goal

The primary goal is to create a new application, `monstereditor`, within the `apps` directory. This tool will serve as an interface for editing monster data and viewing battle simulations. It will feature a frontend built with Vite and a backend powered by Fastify.

## 2. Understanding of the Request

- **New App**: `monstereditor` in `apps/`.
- **Tech Stack**: Vite (frontend), Fastify (backend), TypeScript.
- **Architecture**:
    - Separate frontend and backend.
    - Single startup script from the root `package.json`.
    - Dependency on `packages/logic-core` for data access (`gamedata/monsters`, `gamedata/leveldata`).
    - Dependency on `packages/maprender` for visualization.
- **Backend Responsibilities**:
    - Read/write monster data via API endpoints.
    - (Placeholder) Handle asset creation/modification.
- **Frontend UI**:
    - **Main Layout**: A two-column layout.
        - **Left Column**: Chat/dialogue area with an Agent (placeholder).
        - **Right Column**: Editing and display area.
    - **Right Column Layout**:
        - **Top Section (Selection Area)**:
            - Player configuration popup (level dropdown, 6 empty equipment slots).
            - Monster selection (level dropdown, monster dropdown).
        - **Bottom Section (Battle Simulation)**:
            - 16x16 map rendered with `maprender`.
            - Player and monster displayed side-by-side.
            - Zoom controls.
            - DOM overlays for player and monster stats.
- **Functionality**:
    - Clicking the map triggers a battle simulation.
    - Battle outcome (first attacker, turns, winner, remaining HP, HP loss %) is displayed in a popup.
- **Documentation**:
    - Create this plan file (`jules/plan041.md`).
    - Create a final report (`jules/plan041-report.md`).
    - Update `jules.md` and `agents.md`.

## 3. Task Decomposition

I will break down the implementation into the following steps:

### Step 1: Project Scaffolding
- Create the directory structure for `apps/monstereditor`.
- Create initial configuration files: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`. These will be adapted from the existing `apps/mapeditor` project to ensure consistency.
- Create basic source directories: `src/`, `src/client/`, `src/server/`.

### Step 2: Backend Server (Fastify)
- Create `src/server.ts` to set up a basic Fastify server.
- Implement API endpoints:
    - `GET /api/monsters`: Read all monster file names from `gamedata/monsters/`.
    - `GET /api/monsters/:id`: Read the content of a specific monster JSON file.
    - `GET /api/leveldata`: Read the content of `gamedata/leveldata.json`.
- Create `src/run-server.ts` to launch the server, similar to other editor apps.

### Step 3: Root Configuration
- Add a new script `dev:monstereditor` to the root `package.json` to start the `monstereditor` development server.

### Step 4: Frontend - Basic Layout & UI Shell
- Create the main application file `src/client/app.ts`.
- Implement the basic HTML structure in `index.html` for the two-column layout.
- Add basic CSS for the layout.
- Create placeholder components for the chat area, selection area, and rendering area.

### Step 5: Frontend - Selection Area
- Implement the player configuration section.
    - Add a button that opens a modal/popup (initially, it can be a simple placeholder).
    - Inside the popup, create a dropdown for player level.
- Implement the monster selection section.
    - Create a dropdown for monster level.
    - Create a dropdown for monsters.
- Write the client-side logic to fetch data from the backend (`/api/leveldata`, `/api/monsters`) to populate these dropdowns.

### Step 6: Frontend - Battle Simulation Rendering
- Integrate the `@proj-tower/maprender` package into the client application.
- Initialize `MapRender` with an empty 16x16 map.
- Create `CharacterEntity` instances for a default player and monster and add them to the map.
- Implement the DOM overlays to display character stats. The data will be static initially.
- Add zoom controls.

### Step 7: Battle Simulation Logic
- Add a click event listener to the map rendering area.
- When clicked, gather the selected player and monster data.
- Use functions from `packages/logic-core` to calculate the battle outcome.
- Display the results (first attacker, turns, winner, HP stats) in a popup alert.

### Step 8: Final Documentation
- After the implementation is complete and verified, create the report file `jules/plan041-report.md`.
- Update `jules.md` to include a section describing the new `monstereditor`.
- Review `agents.md` and update it if any new conventions or instructions have been introduced.

This plan provides a clear path from setup to completion, ensuring all requirements of the task are met in a structured manner.
