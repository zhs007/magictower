# 计划 008: 屏幕管理与菜单界面

## 目标

构建一个场景（或屏幕）管理器，用于控制不同游戏界面的显示和切换，例如从开始菜单到主游戏界面。并实现功能完备的开始菜单。

## 主要任务

**设计注意**: 所有场景（开始菜单、游戏主界面、存档界面等）的实现都必须遵循 `plan011.md` 中定义的分辨率和屏幕适配规范。UI 元素布局需在 `1080x1920` 的设计分辨率内完成。

1.  **创建场景管理器 (`src/scenes/scene-manager.ts`)**:
    - 创建一个 `SceneManager` 类。
    - 负责管理一个 Pixi.js `Stage`，并能在不同的场景 `Container` 之间切换。
    - 提供一个 `goTo(sceneName: string)` 方法，用于销毁当前场景并加载新场景。

2.  **定义场景基类 (`src/scenes/base-scene.ts`)**:
    - 创建一个抽象的 `BaseScene` 类，它继承自 Pixi.js `Container`。
    - 所有其他场景（如开始菜单、游戏场景）都将继承自这个基类。
    - 基类应包含 `constructor`, `destroy`, `update` (可选) 等生命周期方法。

3.  **实现开始菜单场景 (`src/scenes/start-scene.ts`)**:
    - 创建 `StartScene` 类，继承自 `BaseScene`。
    - **UI 元素**:
        - 使用 `Sprite` 添加游戏 Logo。
        - 创建 "新游戏" 按钮。
        - 创建 "继续游戏" 按钮。
    - **按钮交互**:
        - 为按钮添加 `interactive = true` 和 `cursor = 'pointer'` 属性。
        - 添加 `pointerdown` 或 `click` 事件监听器。
        - **"新游戏"**: 点击后，调用 `sceneManager.goTo('game')`，并传递一个信号表明是新游戏。
        - **"继续游戏"**: 点击后，
            1.  调用 `saveManager.listSaves()` 获取所有存档。
            2.  动态创建一个存档列表 UI，让玩家选择。
            3.  选择一个存档后，调用 `sceneManager.goTo('game')`，并传递加载该存档所需的 `slotId`。
            4.  如果没有任何存档，"继续游戏" 按钮应为禁用状态（灰色）。

4.  **实现游戏主场景 (`src/scenes/game-scene.ts`)**:
    - 创建 `GameScene` 类，继承自 `BaseScene`。
    - 这个场景将封装之前计划中创建的所有游戏内元素：`GameStateManager`, `Renderer`, `InputManager`, `HUD` 等。
    - 构造函数可以接收一个参数，例如 `{ newGame: true }` 或 `{ loadSlot: 'slot_1' }`。
    - 根据构造函数的参数，来决定是创建一个全新的 `GameStateManager` 还是从 `SaveManager` 加载一个游戏。

5.  **整合到主应用 (`src/main.ts`)**:
    - 修改 `main.ts`，使其不再直接创建游戏组件。
    - 初始化 `SceneManager`。
    - 设置初始场景为 `sceneManager.goTo('start')`。
    - 将 `SceneManager` 的舞台添加到 Pixi.js 应用的主舞台。

## 验收标准

- 应用启动后，首先显示的是开始菜单，包含 Logo、"新游戏" 和 "继续游戏" 按钮。
- 如果没有存档，"继续游戏" 按钮是灰色的或不可点击。
- 点击 "新游戏" 按钮后，屏幕会平滑地（或立即）切换到游戏主界面，并开始一个全新的游戏。
- 如果存在存档，点击 "继续游戏" 按钮会显示一个存档列表。
- 从存档列表中选择一个存档后，会进入游戏主界面，并成功加载所选的游戏进度。
- 在游戏场景中，可以正常进行游戏。未来可以添加返回主菜单的功能。
