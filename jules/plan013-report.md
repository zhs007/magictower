# Plan 013 Report: Refactor to Event-Driven Architecture

## 1. Summary

This report details the work completed for `plan013`. The goal was to refactor the game's architecture from a polling-based model to a more robust and scalable event-driven system. This refactoring was initiated based on user feedback to improve the decoupling of game logic and UI rendering. The task has been successfully completed.

## 2. Architectural Changes

The core of this refactoring was the introduction of a global `EventManager`.

-   **EventManager**: A new singleton class was created in `src/core/event-manager.ts`. It provides a centralized system for dispatching events and registering listeners, with `on()`, `off()`, and `dispatch()` methods.

-   **Logic as Event Dispatcher**: The core game logic in `src/core/logic.ts` was modified to be the primary source of events. Instead of just changing state, functions like `handleAttack` and `handlePickupItem` now dispatch specific events (e.g., `HP_CHANGED`, `KEYS_CHANGED`, `BATTLE_ENDED`) with relevant data payloads.

-   **UI as Event Listener**: The `HUD` class in `src/renderer/ui/hud.ts` was completely refactored. It no longer polls for changes in a generic `update` method. Instead, it registers itself as a listener for the events it cares about upon initialization. It now reacts instantly to game events, updating only the necessary parts of the UI when notified.

## 3. Bug Fixes and Improvements

This refactoring directly addressed the bugs reported by the user:

-   **HP Not Updating in Battle**: The original issue where the player's HP did not update on the HUD during combat is now resolved. The `HP_CHANGED` event ensures the UI refreshes immediately.
-   **HP Not Persisting After Battle**: The subsequent issue where the player's HP reverted after battle is also fixed. The `BATTLE_ENDED` event now carries the final HP state, ensuring the HUD displays the correct value.

The new architecture also provides significant benefits:
-   **Decoupling**: The game logic no longer needs to know about the UI. It just sends out a notification that something happened.
-   **Performance**: The UI only redraws parts of itself when it receives a relevant event, which is more efficient than a full redraw on every frame.
-   **Scalability**: It is now much easier to add new features. For example, to add a screen shake effect when the player gets hit, we can simply add a new listener to the `HP_CHANGED` event without touching any of the core game logic.

## 4. Testing

-   The unit tests for the `HUD` (`src/renderer/ui/hud.test.ts`) were rewritten to accommodate the new event-driven design. This involved mocking the `EventManager` and verifying that the `HUD` correctly registers, unregisters, and responds to events.
-   A subtle issue with `vitest`'s mocking of PIXI.js classes was identified and fixed, allowing all tests to pass.
-   All 58 unit tests in the project are currently passing.

## 5. Conclusion

The `plan013` refactoring has been a success. The codebase is now more robust, maintainable, and aligned with modern game development best practices. The bugs that prompted this change have been resolved, and the project is in a much better state for future development.
