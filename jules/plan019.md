# Plan 019: Generic Floating Text Manager

## 1. Task Goal

To refactor the existing floating text logic and create a new, generic, and robust Floating Text Manager. This manager will handle all floating text animations in the game, such as damage numbers, healing, and item pickups, in a queued and organized manner.

## 2. Key Features

-   **Generic Module:** Create a `FloatingTextManager` class. This class will be responsible for creating, managing, and animating floating text elements. It will likely be a part of the renderer.
-   **Animation Queue:** The manager will maintain a queue of text animation requests. It will process one animation at a time, starting the next one only after the previous one has reached a certain point in its animation (e.g., moved a certain distance or after a set time). This will prevent text from spawning on top of each other and becoming unreadable.
-   **Typed Colors and Styles:** Implement a type system for different categories of floating text. This will allow for predefined styles (color, font size, animation path) to be applied easily.
    -   `DAMAGE`: Red, for HP loss.
    -   `HEAL`: Green, for HP gain.
    -   `ITEM_GAIN`: Yellow, for picking up items.
    -   `STAT_INCREASE`: Orange, for permanent stat boosts.
-   **Integration:**
    -   Refactor the `animateAttack` function in `renderer.ts` to use the new `FloatingTextManager` for displaying damage numbers.
    -   Modify the item pickup logic (`handleItemPickup` in `game-scene.ts`) to call the `FloatingTextManager` to display messages like "+1 Yellow Key".

## 3. Implementation Plan

1.  **Create `FloatingTextManager`:**
    *   Create a new file: `src/renderer/ui/floating-text-manager.ts`.
    *   Define the `FloatingTextType` enum or type alias for the different styles.
    *   Implement the `FloatingTextManager` class. It should have a public method like `add(text: string, type: FloatingTextType, position: {x: number, y: number})`.
    *   Implement the internal queue and the logic to process it. Use `gsap` for the animations.

2.  **Integrate with Renderer:**
    *   Instantiate the `FloatingTextManager` within the `Renderer` class in `renderer.ts`.
    *   Refactor the `animateAttack` function. Remove the manual `Text` creation and animation logic, and replace it with a call to `this.floatingTextManager.add(...)`.

3.  **Integrate with Item Pickup:**
    *   In `game-scene.ts`, inside the `handleItemPickup` callback, after the `PICK_UP_ITEM` action is dispatched, add a call to the `FloatingTextManager` to show the item gain message.

4.  **Write Tests:**
    *   Create a new test file `src/renderer/ui/floating-text-manager.test.ts`.
    *   Write unit tests for the `FloatingTextManager`, including its queuing mechanism.

5.  **Update Documentation:**
    *   Update `jules.md` with a new section explaining how to use the `FloatingTextManager`.

6.  **Final Report:**
    *   Create `jules/plan019-report.md` to summarize the work done.

## 4. Acceptance Criteria

-   Damage numbers in combat are displayed using the new manager.
-   Picking up a yellow key displays a "+1 Yellow Key" floating text message.
-   If multiple damage numbers or messages are triggered in quick succession, they appear one after another without overlapping.
-   All existing tests pass, and new tests for the manager are added.
-   `jules.md` is updated.
-   `plan019-report.md` is created.
