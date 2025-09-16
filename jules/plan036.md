# Plan 036: Enhance Map Editor

## 1. 需求理解 (Requirement Understanding)

根据用户反馈，当前的地图编辑器 (`mapeditor`) 需要进行功能增强。主要有两点：
1.  **动态地图尺寸**: 编辑器中的地图网格目前硬编码为 32x32。需要修改为：
    - 加载现有地图时，网格尺寸应与地图数据 (`layout` 数组的尺寸) 保持一致。
    - 创建新地图时，使用可配置的默认尺寸，默认为 16x16。
2.  **创建新地图**: 编辑器目前只能编辑现有地图，需要添加创建新地图的功能。

## 2. 任务分解 (Task Breakdown)

### 步骤 1: 动态调整地图网格尺寸

1.  **CSS 修改**:
    - 修改 `apps/mapeditor/src/client/style.css` 中的 `#map-grid` 样式。
    - 移除硬编码的 `grid-template-columns` 和 `grid-template-rows`。这些样式将通过 JavaScript 动态设置。

2.  **JavaScript (main.ts) 修改**:
    - 修改 `renderMapGrid` 函数。
    - 在渲染网格前，首先获取地图的宽度 (`mapData.map.layout[0].length`) 和高度 (`mapData.map.layout.length`)。
    - 使用获取到的宽高动态设置 `#map-grid` 元素的 `gridTemplateColumns` 和 `gridTemplateRows` 样式属性。例如: `grid.style.gridTemplateColumns = \`repeat(${width}, 20px)\`;`.

### 步骤 2: 实现创建新地图功能

1.  **UI 添加**:
    - 在 `apps/mapeditor/index.html` 中，在“保存”按钮旁边添加一个“新建地图”按钮 (`<button id="new-map-button">New Map</button>`).

2.  **环境变量与默认尺寸**:
    - 用户提到从 env 文件配置默认尺寸。Vite 支持 `.env` 文件。我将在 `apps/mapeditor` 目录下创建一个 `.env` 文件。
    - `.env` 文件内容: `VITE_DEFAULT_MAP_WIDTH=16`, `VITE_DEFAULT_MAP_HEIGHT=16`。
    - 在 `main.ts` 中，通过 `import.meta.env.VITE_DEFAULT_MAP_WIDTH` 读取这些值。

3.  **创建逻辑 (main.ts)**:
    - 为“新建地图”按钮添加点击事件监听器。
    - 点击后，弹出一个 `prompt` 对话框，让用户输入新地图的文件名 (map ID)。
    - 如果用户输入了文件名，则：
        - 创建一个默认的 `GameState` 对象。
        - `layout` 数组根据从 `.env` 文件读取的默认宽高 (16x16) 生成，并用默认的地面 tile ID (通常是 0) 填充。
        - `tileAssets` 应包含一个默认的地面瓦片定义，例如 `{"0": { "assetId": "map_floor", "isEntity": false }}`。
        - 将这个新的 `GameState` 对象设置为 `state.currentMapData`，并将新的 map ID 设置为 `state.currentMapId`。
        - 调用 `rerenderAll()` 来刷新整个编辑器界面，显示出新的空白地图。

### 步骤 3: 测试与验证

1.  启动地图编辑器开发服务器。
2.  **验证动态尺寸**: 加载一个非 32x32 的地图 (例如 16x16 的 `floor_01.json`)，确认编辑器中的网格尺寸是否正确匹配。
3.  **验证新建地图**:
    - 点击“新建地图”按钮。
    - 输入一个新的地图名称，例如 `test_map`。
    - 确认编辑器中出现了一个 16x16 的空白网格。
    - 在新地图上绘制一些瓦片。
    - 点击“保存”按钮。
4.  **验证持久化**:
    - 检查 `mapdata/` 目录下是否生成了 `test_map.json` 文件。
    - 刷新编辑器页面，从下拉菜单中选择 `test_map`，确认之前绘制的内容被正确加载。

### 步骤 4: 文档更新

1.  创建 `jules/plan036-report.md`，记录本次增强功能的开发流程和遇到的问题。
2.  更新 `jules.md` 中关于地图编辑器的部分，补充新地图创建和动态尺寸的说明。
3.  更新 `README.md` 中关于地图编辑器的部分（如果需要）。

## 3. 预期产出 (Expected Outcome)

- 一个功能增强的地图编辑器，支持动态地图尺寸和新地图创建。
- 更新后的 `jules.md` 和 `README.md` 文档。
- `jules/plan036.md` (本文件) 和 `jules/plan036-report.md`。
