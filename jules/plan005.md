# 计划 005: 玩家输入与主游戏循环

## 目标

实现玩家输入处理，并建立起完整的“输入 -> 逻辑 -> 渲染”主游戏循环。这将使玩家能够实际控制角色在游戏世界中移动和互动。

## 主要任务

1.  **创建输入管理器 (`src/core/input-manager.ts` 或类似文件)**:
    - 创建一个 `InputManager` 类或模块。
    - 监听 `keydown` 事件，以捕捉玩家的键盘输入（例如，方向键、WASD）。
    - 针对移动端，可以添加简单的屏幕区域点击事件监听，将屏幕四角映射为上、下、左、右四个方向。
    - **重要**: 输入管理器的作用是**将原始输入（如 `ArrowUp` 键被按下）转换为游戏逻辑可以理解的意图（如 `MOVE_UP`）**。它不直接执行游戏逻辑。

2.  **将输入意图转换为 `Action` 对象**:
    - 当 `InputManager` 检测到一个有效的玩家输入（如 `MOVE_UP`），它应该创建一个对应的 `Action` 对象。
    - 例如，`MOVE_UP` 意图会生成 `{ type: 'MOVE', payload: { dx: 0, dy: -1 } }`。
    - 这个 `Action` 对象是接下来要被派发给逻辑层处理的数据。

3.  **建立主游戏循环 (`src/main.ts` 或 `src/scenes/game-scene.ts`)**:
    - 移除在计划 004 中创建的临时循环。
    - 实例化所有核心组件：
        - `const gameStateManager = new GameStateManager();`
        - `const renderer = new Renderer(app.stage);`
        - `const inputManager = new InputManager();`
    - **循环流程**:
        1.  **检查输入**: `inputManager` 监听输入。当有输入时，生成一个 `Action`。
        2.  **派发动作**: 将生成的 `Action` 传递给 `gameStateManager.dispatch(action)`。
        3.  **更新状态**: `GameStateManager` 内部根据 `Action` 更新游戏状态，并返回新的 `GameState`。
        4.  **渲染画面**: 调用 `renderer.render(newGameState)`，将更新后的游戏状态绘制到屏幕上。

4.  **处理游戏节奏**:
    - 由于游戏是回合制的（玩家不动，游戏就不变），主循环不需要以 60 FPS 的频率持续运行逻辑。
    - 渲染循环（`requestAnimationFrame`）可以持续运行，但游戏逻辑的更新（`dispatch`）只应该在玩家产生有效输入时才被触发。

## 伪代码示例

```typescript
// In main.ts or GameScene.ts

// Initialization
const gameStateManager = new GameStateManager();
const renderer = new Renderer(app.stage);
const inputManager = new InputManager();

// Initial render
renderer.render(gameStateManager.getState());

// Input handling
inputManager.on('action', (action) => {
  // 2. Dispatch the action to the logic core
  gameStateManager.dispatch(action);

  // 3. Get the new state and render it
  const newState = gameStateManager.getState();
  renderer.render(newState);
});

// The renderer can have its own animation loop if needed for things
// like tweens or visual effects, but the game state only changes
// on input.
```

## 验收标准

- 按下方向键或点击屏幕指定区域后，玩家角色能够在地图上正确移动（进入可通过的格子）。
- 玩家角色无法移动到墙壁或其他障碍物上。
- 当玩家角色移动到道具上时，道具会消失，并且玩家的相应属性会更新（需要配合下一步的 UI 显示来验证）。
- 当玩家角色移动到怪物上时，战斗会发生，战斗结果会反映在状态中（例如，玩家 HP 减少）。
- 整个流程遵循“输入 -> 逻辑更新 -> 渲染”的单向数据流。
- 游戏在没有玩家输入时，状态保持静止。
