# 计划 004: 基础渲染引擎

## 目标

创建一个渲染器，它能够接收 `GameState` 对象并将其可视化地呈现在屏幕上。这是连接独立的核心逻辑和 Pixi.js 视觉表现的桥梁。

## 核心原则

- **渲染器是“哑”的**: 渲染器自身不包含任何游戏逻辑。它的唯一职责是根据传入的 `GameState` 来绘制画面。它响应状态的变化，但不决策状态如何变化。

## 主要任务

1.  **初始化 Pixi.js 应用**:
    - 在 `src/main.ts` 中，创建一个 Pixi.js `Application` 实例。
    - 设置舞台（`app.stage`）和视口（`app.view`），确保其尺寸适应手机竖屏。
    - 将 Pixi.js 的 `<canvas>` 元素添加到 `index.html` 的 DOM 中。

2.  **创建渲染器类 (`src/renderer/renderer.ts`)**:
    - 创建 `Renderer` 类。
    - 构造函数接收 Pixi.js 的 `stage` 作为参数。
    - 包含一个 `render(state: GameState)` 方法，此方法将在每一帧被调用。

3.  **资源加载**:
    - 在 `Renderer` 中实现一个 `loadAssets()` 方法。
    - 使用 Pixi.js 的 `Assets.load()` 来加载所有必要的图片资源（地图图块、怪物、道具）。
    - 资源路径应从 `DataManager` 或 `GameState` 中获取，与 `assetId` 对应。

4.  **实现 `render` 方法**:
    - **清空舞台**: 在每次渲染开始时，清空上一帧的内容。
    - **渲染地图**:
        - 遍历 `state.map.layout` 二维数组。
        - 根据每个 tile 的 `groundLayer` ID，从已加载的资源中找到对应的纹理，并创建一个 `Sprite`。
        - 将 `Sprite` 放置在舞台的正确位置。
    - **渲染实体（怪物、道具、玩家）**:
        - 遍历 `state.entities` 列表。
        - 根据每个实体的 `assetId` 获取纹理，并创建 `Sprite`。
        - 将 `Sprite` 放置在地图对应的网格位置。
        - 玩家的 `Sprite` 应该被特殊处理或置于顶层。

5.  **创建简单的游戏主循环**:
    - 在 `src/main.ts` 中，设置一个临时的游戏循环。
    - 在循环中：
        - 获取当前的（可能是静态的、用于测试的）`GameState`。
        - 调用 `renderer.render(gameState)`。

## 验收标准

- 应用启动后，浏览器中会显示一个由 Pixi.js 渲染的画布。
- `Renderer` 能够成功加载 `assets/` 目录下的所有图片资源。
- 能够根据一个静态的 `GameState` 对象，正确地渲染出完整的地图背景。
- 能够将玩家、怪物和道具的精灵图正确地绘制在地图的指定位置上。
- 渲染器代码与核心逻辑代码保持分离，`src/renderer/` 目录下的文件不应修改 `GameState`。
