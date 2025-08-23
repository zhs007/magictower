# Jules 开发文档

本文档用于追踪 `jules` AI 代理的开发活动和项目状态。

## 当前开发状态

`jules` 代理正在按顺序执行 `jules/` 目录下的 `plan[id].md` 文件中定义的开发计划。

- **已完成的计划**:
    - `plan001`
    - `plan002`
    - `plan003`
    - `plan004`
    - `plan005`
    - `plan006`
    - `plan007`
    - `plan008`
    - `plan010`
    - `plan011`

- **当前任务**:
    - `plan008` 的执行和测试已完成，报告已生成 (`plan008-report.md`)。

## 下一步行动

根据 `jules/` 目录下的文件，下一个未完成的计划是 `plan009.md`。

- **建议的下一个任务**: **执行 `plan009.md`**。

## 新增：资源命名与地图处理说明

近期修改了项目中资源（assets）别名与加载规则，现将关键约定记录于此：

- 资源别名规则：`<type>_<filename>` 或 顶层 `filename`（例如：`monster_monster`, `item_item`, `player`）。
- renderer 使用 `import.meta.glob` 自动生成 manifest，alias 按上述规则生成。
- gamedata 中新增 `assetId` 字段优先作为资源别名，回退到 `id` 字段。

注意：目前 `map` 的贴图处理使用的是一个临时方案（renderer 中加入了 `resolveTextureAlias` 并尝试 `map_floor` 等别名）；后续计划将 `map` JSON 扩展一个字段，用于把 `layout` 中的数字映射到 `assetId`（而 `assets/map` 下的图片仍按 `map_<filename>` 的规则命名）。该变更计划已编入 `jules/plan018.md`，准备在后续迭代中实施。

在开始下一个任务之前，请验证当前代码库的稳定性和功能完整性。
