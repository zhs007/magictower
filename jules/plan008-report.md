# 任务报告: plan008 - 屏幕管理与菜单界面

## 1. 任务概述

本任务的目标是构建一个场景（屏幕）管理器，用于控制不同游戏界面（如开始菜单、游戏主界面）的显示和切换，并实现一个功能完备的开始菜单。

## 2. 完成情况

遵循 `plan008.md` 的要求，已成功完成所有主要任务。

### 2.1. 场景管理核心

- **`src/scenes/base-scene.ts`**: 创建了场景基类 `BaseScene`，它继承自 `PIXI.Container`。所有场景都将从此类派生，统一了场景的生命周期方法（`onEnter`, `onExit`）和接口。
- **`src/scenes/scene-manager.ts`**: 创建了 `SceneManager` 类，负责管理所有场景的生命周期。通过 `goTo(sceneName, options)` 方法，可以方便地销毁当前场景并切换到新场景，同时支持向新场景传递参数。

### 2.2. 场景实现

- **`src/scenes/start-scene.ts`**:
    - 实现了 `StartScene`，作为游戏的入口。
    - 界面包含一个文本 Logo、"新游戏" 按钮和 "继续游戏" 按钮。
    - "新游戏" 按钮会启动一个全新的游戏。
    - "继续游戏" 按钮会首先调用 `saveManager.listSaves()` 检查是否存在存档。
        - 如果没有存档，按钮会处于禁用状态。
        - 如果有存档，点击后会弹出一个模态窗口，显示所有存档槽位，供玩家选择加载。
- **`src/scenes/game-scene.ts`**:
    - 重构了 `GameScene`，使其继承自 `BaseScene`。
    - 构造函数不再直接依赖 Pixi `Application`，而是接收来自 `SceneManager` 的参数。
    - `onEnter` 方法现在可以根据传入的选项（`{ newGame: true }` 或 `{ loadSlot: 'slot_id' }`）来决定是开始新游戏还是加载存档。

### 2.3. 应用整合

- **`src/main.ts`**:
    - 修改了应用主入口文件。
    - 现在它会初始化 `SceneManager`，并将 `StartScene` 设置为启动场景。
    - 添加了对 `sceneManager.update()` 的调用，以驱动场景的更新逻辑。

### 2.4. 测试

- **`src/scenes/tests/scene-manager.test.ts`**:
    - 为 `SceneManager` 编写了单元测试。
    - 使用 `vitest` 的 `vi.doMock` 和动态导入来模拟场景依赖，以隔离测试 `SceneManager` 的核心逻辑。
    - 测试覆盖了场景切换、参数传递、生命周期方法调用和错误处理等情况。
    - 所有测试均已通过。

## 3. 结论

`plan008` 已成功完成。应用现在拥有一个健壮的场景管理系统和一个功能齐全的开始菜单，为后续开发其他游戏模块（如商店、设置等）奠定了良好的基础。
