# Plan 013: Refactor to Event-Driven Architecture

## 1. Goal

Refactor the game's state update and UI rendering logic from a polling-based system to an event-driven one. This will decouple the game logic from the UI, improve responsiveness, and create a more maintainable and scalable architecture.

## 2. Core Tasks

### a. Create a Global Event Manager

-   **File**: `src/core/event-manager.ts`
-   **Implementation**:
    -   Create a singleton class `EventManager`.
    -   It will have three main methods:
        -   `on(eventName: string, callback: Function)`: To register a listener for a specific event.
        -   `off(eventName: string, callback: Function)`: To remove a listener.
        -   `dispatch(eventName: string, payload?: any)`: To fire an event and notify all its listeners.
    -   The manager will maintain a dictionary of event names to an array of listener callbacks.

### b. Refactor Core Logic to Dispatch Events

-   **File**: `src/core/logic.ts`
-   **Implementation**:
    -   Import and use the `EventManager` singleton.
    -   Identify key points where the game state changes and dispatch events accordingly. Examples:
        -   In `handleAttack`, when a character's HP changes, dispatch `'HP_CHANGED'` with a payload like `{ entityId: string, newHp: number }`.
        -   In `handlePickupItem`, when a key is picked up, dispatch `'KEYS_CHANGED'` with the new key counts.
        -   In `handleEndBattle`, dispatch `'BATTLE_ENDED'`.

### c. Refactor UI to Listen for Events

-   **File**: `src/renderer/ui/hud.ts`
-   **Implementation**:
    -   In the `HUD` constructor, register listeners for events it cares about using `EventManager.on()`.
        -   `eventManager.on('HP_CHANGED', (data) => this.updateHp(data.entityId, data.newHp))`
        -   `eventManager.on('KEYS_CHANGED', (data) => this.updateKeys(data.keys))`
    -   Create specific update methods (e.g., `updateHp`, `updateKeys`) to handle the UI changes for each event.
    -   Remove the old logic from the main `update(state: GameState)` method. The `update` method might still be used for initial setup or for elements that don't have specific events.

### d. Update and Verify Tests

-   **File**: `src/renderer/ui/hud.test.ts`
-   **Implementation**:
    -   Rewrite the HUD tests to reflect the new event-driven nature.
    -   This will likely involve mocking the `EventManager` to simulate event dispatches and verifying that the HUD's text fields are updated correctly in response.
    -   Ensure all other existing tests still pass after the refactoring.

## 3. Acceptance Criteria

-   A global `EventManager` is implemented and used for all relevant state change notifications.
-   The `HUD` updates its display based on events, not on a polling `update` call.
-   The game logic correctly dispatches events when state changes occur.
-   The player's HP, keys, and other stats update on the HUD in real-time during gameplay.
-   All unit tests are updated and passing.
-   The original bugs related to HP display are resolved.
-   The overall architecture is cleaner and more decoupled.
