# Plan 014 Report: Sprite and Rendering System Refactoring

## 1. Summary

This development plan focused on a significant refactoring of the game's rendering system to support larger, more dynamic sprites and to implement a proper Z-ordering mechanism for correct visual layering. The core of the task was to move from 65x65 sprites to 65x130 sprites and handle the resulting occlusion issues between entities and map elements like walls.

## 2. Changes Implemented

### 2.1. Core Logic and Data Structures (`src/core/`)
- **Type Definitions (`types.ts`):**
    - Added a `direction: 'left' | 'right'` property to the `ICharacter` interface to track which way a character is facing.
- **State Management (`state.ts`):**
    - Updated the initial state creation logic to set a default `direction` of `'right'` for all player and monster entities.
- **Game Logic (`logic.ts`):**
    - Modified the `handleMove` function to update the player's `direction` based on horizontal movement (`dx`), enabling directional sprite flipping.

### 2.2. Rendering Engine (`src/renderer/`)
- **Container Restructuring:**
    - The previous `mapContainer` and `entityContainer` were replaced with a more robust, multi-layered system:
        - `floorContainer`: For non-sorted floor tiles.
        - `mainContainer`: A sortable container (`sortableChildren = true`) for all dynamic game objects, including entities and walls, allowing them to be layered correctly.
        - `topLayerContainer`: A second sortable container that renders above everything else, intended for UI effects like damage numbers or special animations.
- **Z-Ordering Implementation:**
    - The rendering logic now uses a "painter's algorithm" approach. The `zIndex` of all sprites in the `mainContainer` (entities and walls) is set to their `y` grid coordinate. Because the container is sortable, objects that are lower on the screen (higher `y` value) are automatically rendered on top of objects that are higher up.
- **Sprite Property Updates:**
    - **Size and Scaling:** After several corrections based on user feedback, the final implementation renders all sprites at their **native pixel dimensions** (1:1 scale). All scaling logic was removed to give artists full control over the sprite's size and shape directly through the source PNG file. This allows for assets that are wider or taller than the standard 65px tile and "exceed the frame" as intended.
    - **Anchor Point:** The anchor point for these sprites is `(0.5, 1)` (bottom-center). This ensures that no matter the asset's dimensions, it is always positioned correctly on its logical tile.
    - **Positioning:** The `y` coordinate calculation for sprites was updated to `(entity.y + 1) * TILE_SIZE` to accommodate the new anchor point.
    - **Directional Flipping:** Sprites are now flipped horizontally by setting `sprite.scale.x = -1` when an entity's `direction` is `'left'`.
- **Wall Rendering:**
    - Walls are no longer static tiles but are now sprites placed in the `mainContainer`, allowing them to correctly occlude and be occluded by other entities.
- **Animation Adjustments:**
    - The `animateAttack` function was updated to correctly position the damage text above the new, taller sprites.

### 2.3. Testing (`src/renderer/tests/`)
- Created a new test file, `plan014.test.ts`, with a comprehensive suite of unit tests for the new rendering logic. These tests verify correct sprite sizing, anchoring, z-index assignment, and directional flipping.
- Refactored the existing renderer test file, `renderer.test.ts`, to work with the new container structure and rendering logic, ensuring no regressions were introduced.
- All 66 tests in the project pass.

## 3. Documentation
- **`jules.md`:**
    - Added a new "Assets 规则" section detailing the requirements for all character, item, and wall assets (65x130, bottom-center anchor, right-facing default).
    - Updated the "当前开发状态" section to include the completion of `plan014`.

## 4. Conclusion
The rendering system has been successfully upgraded. The new system is more flexible, supports more expressive assets, and correctly handles complex layering scenarios, providing a solid foundation for future visual enhancements. All associated logic has been updated and thoroughly tested.
