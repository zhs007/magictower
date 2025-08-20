# 计划 007: 存档与读档系统

## 目标

实现一个强大而灵活的存档/读档系统。该系统不仅能保存玩家进度，还应遵循“记录每一步操作”的要求，以便未来进行数据分析或实现游戏回放功能。

## 核心设计

- **基于操作的存档**: 存档文件将不直接存储庞大的 `GameState` 快照。相反，它将存储 **初始种子状态** 和一个 **玩家执行过的 `Action` 列表**。
- **优点**:
    - **文件体积小**: `Action` 对象通常比整个 `GameState` 小得多。
    - **可回放/分析**: 可以重播 `Action` 列表，精确复现整个游戏过程。
    - **易于调试**: 可以检查 `Action` 序列来定位 bug。

## 主要任务

1.  **定义存档数据结构 (`src/core/types.ts`)**:
    - 创建 `SaveData` 接口：
      ```typescript
      interface SaveData {
        timestamp: number;
        initialStateSeed: any; // 用于生成初始游戏状态的种子或配置
        actions: Action[];     // 从游戏开始到存档点的所有 Action 记录
        screenshot?: string;   // 存档时的游戏截图 (可选，用于存档列表显示)
      }
      ```

2.  **修改 `GameStateManager` 以记录 `Action`**:
    - 在 `GameStateManager` 中，添加一个 `actionHistory: Action[]` 数组。
    - 每当 `dispatch(action)` 方法被调用时，在处理完逻辑后，将该 `action` push 到 `actionHistory` 数组中。

3.  **实现存档管理器 (`src/core/save-manager.ts`)**:
    - 创建 `SaveManager` 类。
    - **`createSaveData(): SaveData`**:
        - 从 `GameStateManager` 获取 `actionHistory`。
        - 记录当前时间戳和初始状态种子。
        - 将这些数据打包成 `SaveData` 对象。
    - **`saveGame(slotId: string)`**:
        - 调用 `createSaveData()` 获取存档数据。
        - 将 `SaveData` 对象序列化为 JSON 字符串。
        - 使用 `localStorage.setItem('save_slot_' + slotId, jsonData)` 将其存储到浏览器本地存储中。
    - **`loadGame(slotId: string): GameState`**:
        - 从 `localStorage.getItem('save_slot_' + slotId)` 读取 JSON 数据。
        - 反序列化为 `SaveData` 对象。
        - **重建状态**:
            1.  创建一个全新的、初始的 `GameStateManager`。
            2.  使用 `saveData.initialStateSeed` 来确保初始状态一致。
            3.  遍历 `saveData.actions` 数组，依次将每个 `action` dispatch 给 `GameStateManager`。
            4.  当所有 `action` 都被重新执行后，`GameStateManager` 内部的状态就恢复到了存档时的状态。
            5.  返回最终的 `GameState`。
    - **`listSaves(): SaveData[]`**:
        - 遍历 `localStorage`，找出所有符合 `save_slot_` 格式的条目，并将其加载为 `SaveData` 对象列表返回。

4.  **集成到 UI 中 (占位)**:
    - 暂时可以在游戏中通过开发者工具调用 `saveManager.saveGame('test')` 和 `saveManager.loadGame('test')` 来测试功能。
    - 完整的 UI 集成将在下一步（屏幕管理）中完成。

## 验收标准

- 游戏进行中调用 `saveGame()` 后，`localStorage` 中会创建一个包含 `action` 历史的存档文件。
- 刷新页面或重新打开游戏后，调用 `loadGame()` 能够成功恢复游戏状态，包括玩家的位置、属性、地图上怪物的存活状态等。
- 恢复的状态必须与存档时的状态**完全一致**。
- `SaveManager` 能够正确地列出所有可用的存档。
- 存档和读档过程健壮，能处理无效或损坏的存档数据（例如，通过 `try-catch`）。
