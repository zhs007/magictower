# Plan 038: Implement Entity Class and Update MapRender

## 1. Goal

The goal of this task is to introduce a new `Entity` class to the `maprender` package, which will be used to represent game objects like players, monsters, and items. The `MapRender` class will also be updated to manage and update these entities.

## 2. Task Breakdown

### 2.1. Create `Entity` Class

- **File Location**: `packages/maprender/src/entity.ts`
- **Inheritance**: The `Entity` class will extend `PIXI.Container`.
- **Properties**:
    - `action`: A string property to store the current action name (e.g., "idle", "walk").
    - `actions`: A `Map<string, (deltaTime: number) => void>` to store action callbacks.
- **Methods**:
    - `constructor()`: Initializes the properties.
    - `setAction(actionName: string, callback: (deltaTime: number) => void)`: Sets the current action and stores the callback.
    - `update(deltaTime: number)`: Called every frame. It will execute the callback for the current action, if one exists.

### 2.2. Update `MapRender` Class

- **File Location**: `packages/maprender/src/map-render.ts`
- **Properties**:
    - `entities`: A `Set<Entity>` to store all the entities managed by `MapRender`.
- **Methods**:
    - `addEntity(entity: Entity)`: Adds an entity to the `entities` set and to the `entityContainer`.
    - `removeEntity(entity: Entity)`: Removes an entity from the `entities` set and from the `entityContainer`.
    - `update(deltaTime: number)`: This new method will be called every frame by the game's main loop (Ticker). It will iterate over all entities in the `entities` set and call their `update(deltaTime)` method.

### 2.3. Create TypeScript Definitions

- **File Location**: A new file `packages/maprender/src/types.ts` will be created.
- **Contents**: It will contain the type definitions for the `Entity` class and any other related types. This will ensure that the new code is well-typed and can be easily used by other parts of the application.
- I will also need to export these types from `packages/maprender/src/index.ts`.

### 2.4. Update `jules.md`

- After the implementation is complete, I will update `jules.md` to document the new `Entity` class and the changes to `MapRender`. This will include:
    - A description of the `Entity` class, its properties, and methods.
    - An explanation of how to use the new `setAction` and `update` methods.
    - A summary of the changes to `MapRender`, including the new `update` method and how it manages entities.

### 2.5. Create Report

- After the task is complete and verified, I will create a report file `jules/plan038-report.md` detailing the work done, challenges faced, and solutions implemented.

### 2.6. Update `agents.md`

- I will review the changes and decide if an update to `agents.md` is necessary. Given the nature of this change (a new core class), it's likely that I will need to add a brief description of the `Entity` class and its purpose to `agents.md`.

## 3. Implementation Steps

1.  Create the `packages/maprender/src/types.ts` file with initial type definitions.
2.  Create the `packages/maprender/src/entity.ts` file and implement the `Entity` class.
3.  Modify the `packages/maprender/src/map-render.ts` file to add the `update` method and entity management logic.
4.  Update `packages/maprender/src/index.ts` to export the new `Entity` class and types.
5.  Since this is a library, I'll need to consider how to test it. I will look for existing tests in `packages/maprender` and add new tests for the `Entity` and `MapRender` update logic. If no tests exist, I will consider adding a basic test setup.
6.  Once the implementation is complete and tested, I will update the documentation (`jules.md` and potentially `agents.md`).
7.  Finally, I will create the report file `jules/plan038-report.md`.
