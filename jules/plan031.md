# Plan 031: Move Data Manager to Logic Core

## 1. 原始需求

> 继续调整结构，我觉得 game 里的 dataManager ，应该移到 logic-core 里去。

## 2. 需求理解

- 将 `apps/game/src/data/data-manager.ts` 移动到 `packages/logic-core/src/` 目录下。
- 将其对应的测试文件 `apps/game/src/data/tests/data-manager.test.ts` 也移动到 `packages/logic-core/src/tests/` 目录下。
- 更新所有引用了 `data-manager` 的文件的导入路径。
- 确保移动后，所有测试依然能够通过，项目可以正常运行。
- 任务完成后，更新相关文档。

## 3. 任务分解

1.  **移动文件**:
    -   使用 `mv` 命令移动 `apps/game/src/data/data-manager.ts` 到 `packages/logic-core/src/data-manager.ts`。
    -   使用 `mv` 命令移动 `apps/game/src/data/tests/data-manager.test.ts` 到 `packages/logic-core/src/tests/data-manager.test.ts`。
2.  **更新引用**:
    -   使用 `grep` 在整个项目中搜索 `data-manager` 的引用。
    -   手动编辑找到的文件，将其导入路径从 `'@/data/data-manager'` 或类似路径修改为 `'@/logic-core/data-manager'` (或正确的相对路径)。
3.  **验证**:
    -   运行 `pnpm test` 来确保所有单元测试都能通过。
    -   (可选) 运行 `pnpm dev` 启动游戏，检查功能是否正常。
4.  **文档更新**:
    -   创建 `jules/plan031-report.md` 记录执行过程。
    -   更新 `jules.md` 中的项目结构图和相关描述。
    -   检查 `agents.md`，确认是否需要更新。
