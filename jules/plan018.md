# 计划 018: 为地图 layout 引入 assetsId 映射（设计文档）

## 1. 任务目标

在地图 JSON（`mapdata/*.json`）中加入一张映射表，将 `layout` 中使用的数值映射到 `assets` 中的 `assetId`，以便地图渲染使用稳定的 `assetId` 而非硬编码数字或临时回退策略。

## 2. 背景

当前临时方案中，`drawMap` 使用 `resolveTextureAlias` 先尝试 `map_floor` / `map_wall` 等别名，然后回退到老的 `floor`/`wall`。为了长期维护，地图应该在数据层面明确哪个数字代表哪张图片资源。

## 3. 设计要点

- 在 `mapdata/*.json` 中新增一项 `tiles`（或 `tileAssets`）用于描述数字到 `assetId` 的映射。例如：

```json
"tileAssets": {
  "0": "map_floor",
  "1": "map_wall",
  "2": "map_door_yellow"
}
```

- `renderer.drawMap` 在渲染时，优先使用 `map.tileAssets[tileValue]` 得到 `assetId`，再通过 `Assets.get(assetId)` 获取纹理。
- `assets/map` 内的图片文件仍按 `map_<filename>` 规则命名，并会通过自动 manifest 生成为 alias（如 `map_floor` 等）。

## 4. 实施步骤（后续执行）

1. 在 `mapdata/*.json` 增加 `tileAssets` 字段并为所有地图文件补充映射。
2. 修改 `renderer.drawMap`：读取 `mapData.tileAssets`，并在渲染 loop 中使用映射解析 `assetId`。
3. 运行 `npm run check-assets` 并修正任何缺失的 map 资源。
4. 移除 `resolveTextureAlias` 的 map-specific 回退逻辑（可选，视迁移进度决定）。

## 5. 兼容性与迁移

- 在迁移期间保留 `resolveTextureAlias` 以防止渲染出现空白。完成迁移后可删除回退逻辑。
- 编写脚本把现有地图自动生成 `tileAssets`（使用默认映射：0 -> floor, 1 -> wall），以减少手工工作量。

## 6. 风险与注意事项

- 需要同步美术资源命名与 `tileAssets` 中使用的 alias。
- 若多个地图使用不同 tileset，建议在每个 map JSON 中定义独立的 `tileAssets`，不要假定全局统一。

---
*该计划为设计文档，不在本次变更中执行。*
