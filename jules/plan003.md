# 计划 003: 配置与数据加载

## 目标

建立一套机制，用于从外部 JSON 文件加载游戏数据（怪物、道具）和地图数据。这使得游戏内容可以轻松地被修改和扩展，而无需改动代码。

## 主要任务

1.  **定义数据结构类型 (`src/data/types.ts`)**:
    - 创建与 JSON 文件结构相匹配的 TypeScript 类型。例如：
        - `MonsterData`: 对应 `gamedata/monsters.json` 中的单个怪物条目。
        - `ItemData`: 对应 `gamedata/items.json` 中的单个道具条目。
        - `MapLayout`: 对应 `mapdata/` 中的地图文件结构。

2.  **创建示例配置文件**:
    - 在 `gamedata/` 目录下创建 `monsters.json` 和 `items.json`。
        - **`monsters.json`**: 包含一个怪物数组，每个怪物有 `id`, `name`, `hp`, `attack`, `defense`, `assetId` (图片资源标识) 等字段。
        - **`items.json`**: 包含一个道具数组，每个道具有 `id`, `name`, `type` (e.g., `POTION`, `KEY`, `STAT_BOOST`), `value` (效果数值), `assetId` 等字段。
    - 在 `mapdata/` 目录下创建 `floor_01.json`。
        - 文件内容为一个 JSON 对象，包含 `layout` 字段，其值为一个二维数组，代表地图。
        - 数组中的每个元素是一个对象，如 `{ ground: 1, entity: 101 }`，其中 `1` 是地块 tile 的 ID，`101` 是实体（怪物/道具）的 ID。

3.  **实现数据加载器 (`src/data/data-manager.ts`)**:
    - 创建 `DataManager` 类。
    - 使用 `fetch` API (或 Vite 的 `import.meta.glob`) 来异步加载 JSON 文件。
    - 提供方法来获取数据，例如：
        - `loadGameData()`: 加载所有 `gamedata` 下的配置，并将其存储在内存中（例如，`Map` 对象中，以便通过 ID 快速查找）。
        - `loadMap(level: number)`: 加载指定楼层的地图数据。
        - `getMonsterById(id: number): MonsterData`
        - `getItemById(id: number): ItemData`

4.  **集成到游戏逻辑中**:
    - 修改 `GameStateManager` (`src/core/state.ts`)。
    - 在初始化游戏状态时，使用 `DataManager` 来加载第一层地图和相关的实体数据，生成初始的 `GameState`。

5.  **编写测试**:
    - 编写单元测试来验证 `DataManager`。
    - 模拟 `fetch` 请求或文件读取。
    - 验证加载后的数据是否被正确解析并存储。
    - 测试根据 ID 查找数据的功能是否正常。

## 验收标准

- `gamedata` 和 `mapdata` 目录下的示例 JSON 文件结构清晰、内容正确。
- `DataManager` 能够成功异步加载并解析所有的 JSON 数据文件。
- `DataManager` 提供的方法能根据 ID 准确地返回对应的怪物或道具数据。
- `GameStateManager` 能够利用 `DataManager` 加载的数据来正确生成初始游戏状态。
- 所有与数据加载相关的代码都有相应的单元测试覆盖。
