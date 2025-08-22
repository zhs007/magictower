# 报告: plan007 - 存档与读档系统

## 完成状态

**已完成**

## 概述

根据 `plan007.md` 的要求，本次任务成功实现了基于“操作记录”的存档与读档系统。该系统不直接保存游戏状态快照，而是记录初始种子和玩家操作列表，从而实现了高效、可追溯的进度管理。

## 主要实现内容

1.  **`SaveData` 接口定义 (`src/core/types.ts`)**:
    - 在 `types.ts` 中新增了 `SaveData` 接口，用于标准化存档数据结构，包含时间戳、初始状态种子和操作历史记录。

2.  **`GameStateManager` 扩展 (`src/core/state.ts`)**:
    - 修改了 `GameStateManager` 以支持存档需求。
    - 添加了 `actionHistory: Action[]` 属性，用于记录自游戏开始以来的所有玩家操作。
    - 添加了 `initialStateSeed` 属性，用于存储生成初始游戏状态的种子（当前为楼层号）。
    - `dispatch` 方法现在会自动将每一个 `action` 推入 `actionHistory`。
    - 构造函数和状态初始化方法 (`createInitialState`) 进行了重构，以更好地支持从种子创建新游戏和加载游戏。

3.  **`SaveManager` 实现 (`src/core/save-manager.ts`)**:
    - 创建了全新的 `SaveManager` 类，作为处理所有存档/读档逻辑的核心。
    - **`saveGame(slotId)`**: 将当前游戏状态（种子+操作历史）序列化为 JSON 并存入 `localStorage`。
    - **`loadGame(slotId)`**: 从 `localStorage` 读取存档数据，通过种子重新创建初始状态，然后依次重放 (`dispatch`) 所有 `action`，最终精确恢复游戏状态。
    - **`listSaves()`**: 从 `localStorage` 中检索并返回所有可用的存档列表。
    - 包含了错误处理机制，以应对无效或损坏的存档数据。

4.  **单元测试 (`src/core/tests/save-manager.test.ts`)**:
    - 编写了全面的单元测试来验证 `SaveManager` 的功能。
    - 测试覆盖了以下场景：
        - 成功保存和加载游戏。
        - 验证加载后的状态与保存前完全一致。
        - 正确列出所有存档。
        - 优雅地处理不存在或已损坏的存档槽。
    - 修复了因 `GameStateManager` API 变更而导致的现有测试 (`state.test.ts`) 的回归问题。

## 结论

存档/读档系统已成功实现并通过了所有单元测试。该功能目前已准备好与UI集成。本次开发遵循了“逻辑与渲染分离”和“测试驱动”的原则，确保了代码的健壮性和可维护性。
