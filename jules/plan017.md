# 计划 017: 统一 gamedata -> assets 映射并自动校验

## 1. 任务目标

把游戏数据（gamedata）里的每一项与 `assets/` 中的图片建立稳定且可自动化的映射关系；实现自动生成的 asset manifest、运行时回退策略以及 CI 校验脚本，减少因命名不一致导致的运行时缺失资源问题。

## 2. 背景与动机

近期发现地图/实体在编辑器中渲染失败，主要原因是 gamedata JSON 的 `id` 与文件名/资源别名不一致。为避免未来出现类似问题，需要统一命名约定并在构建/检查流程中加入自动化校验。

## 3. 解决方案摘要

1. 约定：资源别名采用 `类型_文件名`（如 `monster_monster`, `item_item`, `equipment_broadsword`），顶层资源使用文件名（如 `player`）。
2. 代码：在 `src/renderer/renderer.ts` 中，使用 `import.meta.glob` 自动生成 asset manifest，alias 按规则生成（folder_filename 或 filename）。渲染时优先使用 `entity.assetId`，回退至 `entity.id`。新增 `resolveTextureAlias` 以兼容旧 alias。
3. 数据：为 gamedata JSON 添加/统一 `assetId` 字段，格式为 `type_filename`。
4. 校验：新增 `scripts/check-assets.js`，在本地或 CI 中扫描 `assets/` 并验证每个 gamedata 的 `assetId` 是否存在于 manifest 映射中。
5. CI & 脚本：把 `check-assets` 纳入 `npm run check`，支持在提交前运行完整检查（类型检查、格式检查、lint、测试、资源校验）。

## 4. 具体任务清单

- [x] 在 `data-manager` 中增加对文件名注册的回退（以兼容历史 id）。
- [x] 在 gamedata JSON 中添加 `assetId` 字段并统一为 `type_filename`（已修改若干）。
- [x] 将 `renderer.loadAssets()` 改为使用 `import.meta.glob` 自动生成 manifest（alias=folder_filename 或 filename）。
- [x] 在 renderer 中新增 `resolveTextureAlias` 并替换 floor/wall 等硬编码获取。
- [x] 新增 `scripts/check-assets.js` 并添加 `npm run check-assets`。
- [x] 把 `check-assets` 加入 `npm run check`。
- [x] 修复渲染逻辑使怪物/道具/地图贴图可见（包含回退判断）。

## 5. 风险与注意点

- 不能保证所有历史 gamedata 一次性修正；因此保留了 DataManager 的回退注册，作为平滑迁移策略。
- alias 规则应与团队沟通并写入项目文档，避免再次出现命名不一致。

## 6. 下一步建议

- 在 CI（例如 GitHub Actions）中把 `npm run check` 作为 PR gatekeeper。
- 按需把 `assetId` 统一更新到所有 gamedata 文件并移除回退实现。
- 编写简单的 README 片段记录 alias 命名规则与如何添加新资源。


---
*计划 017（草案）*
