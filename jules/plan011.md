# Plan 011: Implement UI Layout and Resolution Scaling

## 1. Task Objective

Implement the new UI design which includes resolution scaling, screen layout, and HUD positioning. This task will involve modifications to the HTML, CSS, and TypeScript source files to match the design specifications.

## 2. Design Specifications (Summary)

- **Design Resolution**: 1080x1920 (Portrait)
- **Scaling**: Maintain aspect ratio, center the canvas, and fill the background with a blurred image.
- **Layout**: The main game map area will be 1040px wide with 20px side margins. The HUD will be at the bottom.
- **Tile Size**: Logical size is 16x16, rendered size is 65x65.

## 3. Implementation Steps

### Step 3.1: CSS and HTML modifications (`index.html`, `src/style.css`)

1.  **Create `src/style.css`**: Create a new CSS file to style the page.
2.  **Add background**: In `style.css`, set a blurred background image for the `body`.
    ```css
    body, html {
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: #000; /* Fallback color */
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        width: 100vw;
    }
    body::before {
        content: "";
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: url('/assets/map/background_blur.png') no-repeat center center;
        background-size: cover;
        filter: blur(8px);
        z-index: -1;
    }
    ```
    *(Note: A placeholder background image `background_blur.png` will need to be added to `assets/map/`)*
3.  **Style Canvas**: Add styles to center the canvas element and handle aspect ratio.
    ```css
    canvas {
        display: block;
        max-width: 100vw;
        max-height: 100vh;
        object-fit: contain;
        box-shadow: 0 0 20px rgba(0,0,0,0.5);
    }
    ```
4.  **Link CSS**: In `index.html`, ensure a `<div id="app"></div>` exists for the Pixi app and link the CSS.
5.  **Import CSS in `main.ts`**: To ensure Vite bundles the CSS, add `import './style.css';` at the top of `src/main.ts`.

### Step 3.2: Application Setup (`src/main.ts`)

1.  **Modify Pixi Application**: Adjust the `PIXI.Application` constructor to use the fixed design resolution (1080x1920) and attach it to the `#app` div.
2.  **Remove auto-resizing**: Any existing JavaScript-based resizing logic should be removed. CSS will now handle all responsive scaling.

### Step 3.3: Game Scene Layout (`src/scenes/game-scene.ts`)

1.  **Position the Map**: The container for the game map should be positioned at `x: 20` to account for the left margin. Its `y` position should be near the top.
2.  **Position the HUD**: The container for the HUD should be positioned below the map area. The exact Y-coordinate will depend on the map's height and should be calculated dynamically or set as a constant.

### Step 3.4: Add Placeholder Asset

1.  To fulfill the CSS requirement, a placeholder image named `background_blur.png` must be created or found and placed in the `assets/map/` directory.

## 4. Verification

After implementation:
- Run the application (`npm run dev`).
- Verify that the canvas is centered on the screen with a blurred background filling the excess space.
- Check that the map is rendered with a 20px margin on the left and right.
- Confirm the HUD appears at the bottom of the screen, below the map.
