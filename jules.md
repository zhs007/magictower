# 项目概要：魔塔 (Project Tower)

## 1. 项目目标

开发一款基于 Pixi.js 和 TypeScript 的网页版魔塔类游戏。游戏核心玩法是玩家在俯视视角的迷宫中探索，通过策略性地击败怪物、收集道具和钥匙来不断挑战更高层。游戏为竖屏手机端设计，无随机性，强调资源管理的策略规划。

## 2. 核心设计原则

- **逻辑与渲染彻底分离**: 游戏核心逻辑（战斗计算、道具效果等）被封装在独立的、无副作用的 `logic-core` 包中。该包不依赖于渲染引擎或任何特定框架，保证了其可移植性和可测试性。
- **Monorepo 架构**: 项目采用 monorepo 结构，将应用 (`apps`) 和可复用包 (`packages`) 清晰地分离开。
- **模块化**: `apps/game` 包内部依然遵循模块化设计，将状态管理、数据加载、渲染和场景管理等功能分离。
- **数据驱动**: 所有游戏数据（怪物属性、道具效果、地图布局）均由外部 JSON 文件定义。数据加载逻辑由 `packages/logic-core/src/data-manager.ts` 负责。注意：目前 `DataManager` 为了加载文件，对 Vite 的 `import.meta.glob` 有依赖，这属于已知的技术债，理想情况下 `logic-core` 包不应包含任何构建工具或框架的特定代码。
- **确定性**: 游戏不包含任何随机因素。玩家以相同的顺序执行相同的操作，必须产生完全相同的结果。
- **可测试性**: 核心逻辑部分必须有高覆盖率的单元测试（目标 > 90%），以保证游戏规则的正确性和稳定性。
- **完整的类型定义**: 所有代码必须使用 TypeScript，并提供完整的类型定义，以增强代码的可维护性和健壮性。
- **详尽的注释**: 为关键函数、类和复杂的逻辑块编写清晰的 JSDoc 注释。

## 3. 技术栈

- **渲染引擎**: Pixi.js (最新版)
- **开发语言**: TypeScript
- **包管理器**: pnpm
- **Monorepo 工具**: Turborepo
- **构建/打包工具**: Vite
- **测试框架**: Vitest
- **代码规范**: ESLint + Prettier

## 4. Monorepo 目录结构

项目已重构为基于 pnpm 和 Turborepo 的 monorepo 结构，以更好地分离关注点并提高可维护性。

```
.
├── apps/
│   └── game/            # 游戏主程序包
│       ├── src/
│       │   ├── core/    # 游戏核心（状态、存读档等）
│       │   ├── renderer/ # 渲染层
│       │   └── scenes/  # 游戏场景
│       ├── index.html
│       └── package.json
│
├── packages/
│   ├── logic-core/      # 纯游戏逻辑核心包
│   │   └── src/
│   └── maprender/       # 地图渲染包
│       └── src/
│
├── gamedata/            # 游戏数据 (全局)
├── mapdata/             # 地图数据 (全局)
├── assets/              # 静态资源 (全局)
├── jules/               # Jules 的开发计划文件
├── scripts/             # 根级别的脚本
├── package.json         # Monorepo 根 package.json
├── pnpm-workspace.yaml  # pnpm 工作区定义
└── turbo.json           # Turborepo 管道定义
```

## 4.1. 地图渲染 (`maprender` 包)

为了进一步贯彻“逻辑与渲染分离”的原则，地图的渲染逻辑被提取到了一个独立的、可复用的 `@proj-tower/maprender` 包中。

- **`MapRender` 类**: 这是该包的核心导岀。它是一个继承自 `PIXI.Container` 的组件。
- **职责**:
    1.  **初始化**: 构造函数接收一个 `GameState` 对象，并根据其中的地图数据（`map` 和 `tileAssets`）自动绘制基础的地面和墙体。
    2.  **分层渲染**: 内部包含一个用于渲染地面的 `floorContainer` 和一个用于渲染实体（墙、角色、道具等）的 `entityContainer`。
    3.  **Y轴排序**: `entityContainer` 启用了 `sortableChildren` 属性。所有加入该容器的 `Sprite` 都会根据其 `zIndex` 属性（通常设置为其逻辑 `y` 坐标）进行自动排序，从而实现正确的遮挡效果。
- **使用方法**:
    - 在主渲染器 (`Renderer`) 中，不再手动绘制地图。
    - 而是创建一个 `MapRender` 实例，并将其添加到主舞台。
    - 玩家、怪物、道具等动态实体的 `Sprite` 则被添加到 `mapRender.entityContainer` 中，由其统一管理排序和渲染。

这种设计将地图渲染的复杂性封装起来，使得主渲染器的代码更简洁，只专注于管理动态实体和UI。

## 5. 数据格式约定

- **配置数据 (`gamedata/`)**: 使用 JSON 格式。每个对象（怪物、道具、装备、Buff）都有一个唯一的字符串 `id`。
  - `monsters`: 定义怪物的基础属性。
  - `items`: 定义可消耗或可使用的道具。
  - `equipments`: 定义可穿戴的装备及其属性加成。
  - `buffs`: 定义可应用于角色的增益或减益效果。
- **地图数据 (`mapdata/`)**: 使用 JSON 格式。包含 `layout` (二维数组定义基本地形) 和 `entities` (对象列表定义怪物、道具等实体的位置和ID)。
- **存档数据**: 使用 JSON 格式。记录游戏初始状态和玩家采取的每一步操作（Action）列表，以实现精确回放和状态恢复。

## 6. 装备系统规则

### 6.1 属性与计算
- **速度 (Speed)**: 新增的核心属性，用于决定战斗中的攻击顺序。速度高的单位先攻击。
- **装备属性**: 装备可以提供两类属性加成：
    - `stat_mods`: 提供固定数值的加减（如 `attack: 10`, `speed: -5`）。
    - `percent_mods`: 提供基于角色 **基础属性** 的百分比加减（如 `attack: 0.1` 表示增加10%的基础攻击力）。
- **属性下限**: 任何角色的任何属性（生命、攻击、防御、速度）在经过装备和Buff计算后，最终值不能低于 **1**。

### 6.2 装备更换逻辑
当玩家获得一件新装备时，系统会按以下规则自动处理：
1.  **空槽位**: 如果对应的装备槽是空的，则直接装备新物品。
2.  **纯粹提升**: 如果新装备提供的所有属性都 **优于或等于** 当前装备（无任何属性降低），则自动更换。旧装备会被移入备用装备栏。
3.  **纯粹降低**: 如果新装备提供的所有属性都 **劣于或等于** 当前装备（无任何属性提升），则自动丢弃新装备。
4.  **混合变化**: 如果新装备的属性有增有减，系统会 **弹出对话框**，显示详细的属性变化，由玩家决定是否更换。
5.  **特殊情况 (武器)**: 任何涉及 **单手武器(1H)与双手武器(2H)之间** 的替换，都将 **强制弹出对话框**，让玩家清晰地看到2件单手武器与1件双手武器之间的数值差异。

## 7. 等级与经验系统

### 7.1 核心属性
- **等级 (Level)**: 角色的核心能力衡量标准，影响其基础属性。
- **经验值 (EXP)**: 玩家通过击败怪物获得，用于提升等级。经验值会累积，不会在升级后清零。
- **最大生命值 (MaxHP)**: 角色的生命值上限，升级可以提升此上限。

### 7.2 经验获取
- **怪物奖励**: 玩家击败怪物后，会获得该怪物提供的经验值。
- **计算公式**: `奖励经验 = floor(怪物MaxHP / 10) + 怪物攻击力 + 怪物防御力 + 怪物速度`

### 7.3 升级规则
- **数据驱动**: 玩家的升级所需经验和升级后的属性，完全由 `gamedata/leveldata.json` 文件定义。该文件是一个等级表，详细列出了每个等级对应的属性值。
- **升级检测**: 每次获得经验后，系统会检测玩家当前的总经验值是否达到了下一等级的要求。
- **属性更新**: 升级时，玩家的各项基础属性（MaxHP, 攻击, 防御, 速度）会直接更新为新等级在 `leveldata.json` 中定义的值。
- **生命恢复**: 升级后，玩家的当前生命值 (`hp`) 会完全恢复至新的最大生命值 (`maxhp`)。
- **连续升级**: 如果一次性获得大量经验，系统支持连续提升多个等级。

### 7.4 玩家初始数据
- 玩家的初始属性（等级1的属性、初始经验等）由 `gamedata/playerdata.json` 文件定义，使得角色初始状态易于配置和管理。

## 8. 开发流程

项目开发遵循 `jules/` 目录下的计划文件。所有命令都应在项目根目录运行，通过 pnpm 和 Turborepo 执行。

- **安装所有依赖**: `pnpm install`
- **启动开发服务器**: `pnpm dev`
- **运行所有测试**: `pnpm test`
- **构建所有包**: `pnpm build`

## 9. 当前开发状态

项目已完成大部分计划的开发任务，包括核心玩法、UI、存档、特殊道具和效果等。

- **已完成**:
    - `plan001` - `plan015`: 全部开发计划均已完成。
    - `plan017` - `plan019`: 已完成。
    - `plan020`: 已完成。
    - `plan021`: 已完成。
    - `plan022`: 已完成。
    - `plan023`: 完成了对玩家和等级数据结构的重构，消除了冗余数据。
    - `plan027`: 修复了地图上的装备和道具无法被正确加载为实体的问题。

- **下一个任务建议**:
    - `plan016`: "优化 Renderer 渲染性能".

- **未开始**:
    - `plan016`

开发仍在进行中。

## 10. Assets 规则

为了支持新的渲染机制，所有非背景的静态资源（如角色、怪物、道具、墙壁）需遵循以下规则：

- **渲染尺寸**: 所有实体（角色、怪物、道具、墙壁）均以其 **原始PNG像素尺寸** 进行渲染，不做任何缩放。
- **美术规范**: 这条规则给予美术对角色尺寸的完全控制。例如，一个 `65x130` 像素的PNG将精确地渲染为65x130像素。若要制作一个更“胖”的角色（例如86像素宽），美术只需提供一个86像素宽的PNG文件，它就会在游戏中占据相应的视觉空间，实现“超框”效果。
- **渲染基准**: 所有图片资源在渲染时将采用 **底部居中** 的对齐方式 (`anchor: 0.5, 1`)。无论图片尺寸如何，它们的“脚”都会被精确地放置在逻辑地块的底边中心。
- **默认朝向**: 所有角色的美术资源 (`player`, `monster`) 默认朝向 **右方**。游戏引擎会根据角色的 `direction` 状态（`'left'` 或 `'right'`）自动水平翻转图片以显示朝左的姿态。

## 11. 资源命名与地图处理说明

项目中资源（assets）别名与加载规则，现将关键约定记录于此：

- **资源别名规则**：`<type>_<filename>` 或 顶层 `filename`（例如：`monster_monster`, `item_item`, `player`）。
- **renderer 使用**：`import.meta.glob` 自动生成 manifest，alias 按上述规则生成。
- **gamedata 优先字段**：`gamedata` 中新增 `assetId` 字段，渲染与校验逻辑优先使用 `assetId`；若缺失则回退到 `id` 字段。
- **map 贴图映射 (tileAssets)**: `mapdata` 中的 JSON 文件包含 `tileAssets` 字段，用于定义地图 `layout` 中数值与贴图资源的映射关系。该结构经过重构，以提供更丰富的元数据。
  - **结构**: `tileAssets` 是一个对象，其键是 `layout` 中的数值（如 "0", "1"），其值是一个包含以下字段的对象：
    - `assetId` (string): 对应于资源别名的ID。
    - `isEntity` (boolean): 一个布尔值，用于标识该贴图是否为“实体”。
      - `true`: 表示该贴图是实体（如墙、柱子），会参与y轴排序以实现遮挡效果，并被渲染在 `entityContainer` 中。
      - `false`: 表示该贴图是地面的一部分，会被渲染在 `floorContainer` 中。
  - **示例**:
    ```json
    "tileAssets": {
      "0": { "assetId": "map_floor", "isEntity": false },
      "1": { "assetId": "map_wall", "isEntity": true }
    }
    ```
  - **渲染逻辑**: `MapRender` 会使用此信息来决定渲染哪个纹理以及如何渲染它。对于标记为 `isEntity: true` 的瓦片，渲染器总会在其下方绘制一个基础的地面瓦片，以确保视觉效果的正确性。

## 12. 浮动文字系统 (Floating Text System)

为了统一处理游戏中的浮动文字效果（如伤害、治疗、道具拾取等），项目引入了 `FloatingTextManager`。

### 12.1 设计目标
- **集中管理**: 所有浮动文字的创建和动画都由该管理器负责。
- **队列机制**: 自动处理多个文字同时触发的情况，按顺序播放动画，避免重叠。
- **样式统一**: 通过预设的类型来控制文字的样式（颜色、大小等），方便统一修改和扩展。

### 12.2 如何使用

`FloatingTextManager` 已在 `Renderer` 中实例化。在游戏的其他部分（如 `GameScene`）中，可以通过 `Renderer` 的公共方法来调用。

**主要方法**:
1.  `renderer.showPlayerFloatingText(text, type)`: 在玩家头顶显示浮动文字。
2.  `renderer.floatingTextManager.add(text, type, position)`: 在指定位置显示浮动文字（主要用于对敌人造成伤害等情况）。

**类型 (`FloatingTextType`)**:
-   `'DAMAGE'`: 红色，用于伤害数值。
-   `'HEAL'`: 绿色，用于恢复效果。
-   `'ITEM_GAIN'`: 黄色，用于道具/钥匙获取。
-   `'STAT_INCREASE'`: 橙色，用于永久属性提升。

**示例: 在 `GameScene` 中显示道具获取信息**
```typescript
// 当玩家拾取道具后
const item = state.items[itemId];
if (item) {
    this.renderer.showPlayerFloatingText(`+1 ${item.name}`, 'ITEM_GAIN');
}
```

在开始下一个任务之前，请验证当前代码库的稳定性和功能完整性。

## 13. 地图生成器工具 (Map Generator Tool)

项目包含一个命令行工具，用于程序化生成地图布局数据。

### 13.1 功能
该工具可以根据指定的参数（如地图尺寸、区域数量、区域连接关系等）生成一个随机的、由墙和地板组成的迷宫布局。核心功能是通过递归分割算法将地图划分为多个区域，并在区域间创建门。

### 13.2 如何使用
1.  **修改参数**: 打开 `scripts/gen-map.ts` 文件，在 `main` 函数中找到 `exampleParams` 对象，根据需要修改其中的参数。
    - `Width`, `Height`: 地图的宽高。
    - `AreaNum`: 要划分的区域数量。
    - `LinkData`: 定义区域之间的连接（门）。例如 `[[0, 1]]` 表示在区域0和区域1之间创建一扇门。
    - `minAreaSize`: 定义每个区域的最小尺寸。例如 `{ 0: [5, 5] }` 表示区域0的最小宽高为5x5。
    - `mapAreaPos`: 强制某些坐标点必须位于特定区域内。例如 `{ 1: [[10, 10]] }` 表示坐标(10,10)必须在区域1中。
    - `outputFilename`: 生成的地图JSON文件的名称。

2.  **运行脚本**: 在项目根目录下，执行以下命令：
    ```bash
    npm run gen-map
    ```

3.  **查看结果**: 脚本执行成功后，会在 `mapdata/` 目录下生成指定的JSON文件。该文件可直接被游戏加载使用。

### 13.4 v2版地图生成器 (Template-based)
项目新增了第二版地图生成器，它采用基于模板匹配的算法，能生成风格更多样、结构更可控的地图。该工具的核心设计思想是生成一个“布局地图”，为后续的关卡流程设计提供基础。

#### a. 核心算法
1.  **两阶段设计**: 地图的创建被分为两个阶段。第一阶段是由本工具生成一张“布局地图”，其中包含所有可能的房间连接点。第二阶段是关卡设计师基于这张布局地图，手动或通过其他工具将一些连接点变为门，将另一些变为墙，最终形成“成型地图”。
2.  **模板库 (`genmap2-templates.json`)**: 生成器使用一个外部JSON文件定义的“房间模板”库。模板中 `0`=地板, `1`=墙, `-1`=留空, `-2`=潜在的门。为了最大化连接性，模板的四面墙上都应尽可能地设置 `-2`。
3.  **约束驱动放置**: 生成器的行为由一个“约束”数组 (`templateData`)驱动。数组的每一个元素都定义了该步骤允许放置的模板的尺寸和房间数范围。生成器会遍历这个数组，每一步都筛选出符合当前约束的模板，然后寻找一个有效位置进行放置。
4.  **有效位置规则**:
    - **墙体粘合**: 模板的墙体（`1`或`-2`）必须与地图上已有的墙体重合。
    - **最小重叠率**: 为了避免房间之间产生空隙，一个位置是有效的，前提是其重叠的墙块数必须大于模板总墙块数（包括`-2`）的40%。
    - **禁止平行墙**: 模板的墙体不能紧挨着地图上已有的墙体，以避免形成两格宽的厚墙。
5.  **保留潜在门口**: 在最终生成的布局地图中，所有非最外墙的 `-2` 都会被完整保留，不会被随机转换成门或墙。这个决策被留给了后续的关卡设计阶段。

#### b. 如何使用
1.  **修改模板**: 编辑 `scripts/genmap2-templates.json` 文件，可以修改、增加或删除房间模板。
2.  **修改参数**: 打开 `scripts/run-gen-map-v2.ts` 文件，修改顶部的 `params` 对象。
    - `Width`, `Height`: 地图的宽高。
    - `templateData`: 约束数组。每个元素 `[minW, minH, maxW, maxH, minRoomNum, maxRoomNum]` 定义了一次模板放置的筛选条件。数组的长度决定了放置的总次数。
    - `forceFloorPos`: 一个坐标数组 `[x, y][]`，强制这些位置必须是地板。
    - `seed`: 随机种子，用于复现生成结果。
    - `outputFilename`: 输出的地图JSON文件名。

3.  **运行脚本**: 在项目根目录下，执行以下命令：
    ```bash
    npm run gen-map:v2
    ```

4.  **查看结果**: 脚本执行成功后，会在 `mapdata/` 目录下生成指定的JSON文件，其中包含了所有潜在门口（`-2`）的布局地图。

## 14. 游戏平衡性说明 (Game Balance Notes)

### 14.1 等级1的数值设计 (Level 1 Stat Design)

为了建立游戏的初始挑战和玩家成长曲线，我们为玩家的1级和三种1级怪物（攻击型、防御型、平均型）设计了详细的数值。核心设计目标是让玩家在1级时，面对7只特定怪物（2攻、2防、3平）的挑战，战斗结束后HP损失约80%，并刚好升级到2级。

### 14.2 等级2到等级3的数值设计与校验工具 (Level 2 to 3 Balance and Validation Tool)

在等级1的基础上，我们为玩家设计了更具挑战性的等级2体验，并成功开发和利用了自动化校验工具来保证其平衡性。

**核心设计目标:**
- 玩家在2级时，面对由1级和2级怪物混合组成的楼层，必须借助新获得的“铁剑”和“小回复药”才能成功清场。
- 怪物伤害足够高，对玩家有明显威胁，总潜在伤害远超玩家2级时的最大HP。
- 玩家升到3级后，属性有显著提升（特别是速度），能反超之前无法先手的速攻型怪物，但2级怪物对其依然有威胁。
- 所有经验值、HP等核心数值都应为易于理解的整数。

**最终实现的数值:**

- **玩家等级数据 (`gamedata/leveldata.json`):**
  - **等级 2:** `{ "maxhp": 200, "attack": 17, "defense": 15, "speed": 12 }`
  - **等级 3:** `{ "exp_needed": 700, "maxhp": 300, "attack": 25, "defense": 22, "speed": 18 }`

- **新怪物数据 (`gamedata/monsters/`):**
  - **速攻型 (暗影螳螂):** `{ "maxhp": 50, "attack": 48, "defense": 5, "speed": 15 }`
  - **强攻型 (持斧哥布林):** `{ "maxhp": 60, "attack": 38, "defense": 10, "speed": 10 }`
  - **普通型 (巨型史莱姆):** `{ "maxhp": 70, "attack": 33, "defense": 12, "speed": 5 }`

- **新道具数据:**
  - **铁剑 (`equipments/iron_sword.json`):** `{ "attack": 13 }`
  - **小回复药 (`items/small_potion.json`):** `{ "heal_amount": 80 }`

**数据校验工具 (`scripts/gamedata-checker.ts`):**
- **现状**: 该脚本已成功扩展，现在包含一个专门的`validateLevel2To3Balance`函数，用于全面校验上述所有设计约束。
- **重要性**: 该工具是确保数值平衡正确性的核心。在开发过程中，它帮助我们快速定位并修复了多个因数值调整而产生的连锁问题，例如EXP总值计算错误、伤害排序错误等。之前遇到的执行环境问题已解决。
- **如何使用**:
  ```bash
  npm run check-gamedata
  ```
  该命令会加载所有游戏数据并运行所有校验。如果任何平衡性约束被破坏，脚本将失败并报告详细错误。强烈建议在对`gamedata`目录下的任何文件进行修改后，都运行此脚本进行验证。

## 15. rmbg gRPC 服务

项目包含一个用于移除图片背景的 gRPC 服务。该服务使用 Python 实现，并被容器化以便于部署和管理。

### 15.1 服务概述
- **功能**: 提供一个 gRPC 端点，接收图片数据，移除背景后返回处理过的图片数据。
- **技术栈**: Python 3.12, gRPC, Docker, `rembg` 库。
- **位置**:
    - **协议定义**: `protos/rmbg.proto`
    - **服务实现**: `services/rmbg/`

### 15.2 如何运行服务
该服务通过 Docker 运行。

1.  **构建 Docker 镜像**:
    在项目根目录下，运行以下命令来构建镜像。
    ```bash
    sudo docker build -t rmbg-service services/rmbg
    ```

2.  **启动 Docker 容器**:
    构建成功后，运行以下命令来启动服务。
    ```bash
    sudo docker run -d -p 50051:50051 --name rmbg-container rmbg-service
    ```
    服务将在后台运行，并监听 `50051` 端口。

3.  **验证服务 (可选)**:
    项目包含一个测试客户端，可以用来验证服务是否正常工作。
    ```bash
    python services/rmbg/src/client.py
    ```
    该客户端会使用 `assets/player.png` 作为输入，并将移除背景后的图片保存为 `assets/player_no_bg.png`。

    *注意：* `rembg` 库在第一次运行时需要下载机器学习模型，这可能需要一些时间。测试客户端的超时时间已设置为120秒以适应这种情况。

### 15.3 gRPC API
- **服务**: `RmbgService`
- **RPC**: `RemoveBackground`
- **请求**: `RemoveBackgroundRequest`
    - `image_data` (`bytes`): 输入的图片文件数据。
- **响应**: `RemoveBackgroundResponse`
    - `image_data` (`bytes`): 移除背景后的 PNG 图片数据。

## 16. 楼层切换系统 (Floor Transition System)

游戏现在支持多楼层以及在它们之间的切换。

### 16.1 数据定义
- **楼梯实体**: 楼层间的切换是通过地图数据中的“楼梯”实体实现的。
- **文件**: `mapdata/floor_XX.json`
- **结构**: 每个地图文件可以包含一个`stairs`对象，其中定义了该层所有的楼梯。同时，在`entities`对象中也要有对应的实体来让它显示在地图上。
- **示例 (`floor_01.json`):**
  ```json
  "entities": {
    "stair_down_1_to_2": { "type": "stair", "id": "stair_down_1_to_2", "x": 14, "y": 14 }
  },
  "stairs": {
    "stair_down_1_to_2": {
      "id": "stair_down_1_to_2",
      "target": {
        "floor": 2,
        "x": 1,
        "y": 1
      }
    }
  }
  ```
  `target`对象指定了目标楼层的编号和玩家在新楼层出现时的坐标。

### 16.2 逻辑流程
该功能的逻辑在代码中已经存在，并且设计得相当完善。
1.  当玩家移动时，`handleMove` (`src/core/logic.ts`) 会检测目标位置的实体。
2.  如果实体是一个楼梯（通过检查`state.stairs[entityId]`是否存在来判断），`handleMove`会返回一个将`interactionState`设置为`{ type: 'floor_change', stairId: ... }`的新游戏状态。
3.  `GameScene` (`src/scenes/game-scene.ts`) 的主循环会检测到这个状态变化，并调用它自己的`handleFloorChange`方法。
4.  `handleFloorChange`方法负责整个切换过程：
    - 它会调用`GameStateManager.createInitialState()`来为目标楼层创建一个全新的状态对象。
    - 关键的是，它会将当前玩家的状态（HP, a/d/s, 装备, 道具等）传入这个函数，以确保玩家状态在楼层间得以保留。
    - 最后，它会用这个新状态重新初始化`GameStateManager`和`Renderer`，完成楼层切换。

这个流程确保了逻辑的清晰分离：核心逻辑（`core`）只负责声明意图（“我要切换楼层”），而场景（`scenes`）则负责执行具体的、与渲染和状态管理相关的操作。

## 17. logic-core 重构（2025-09-12）

以下为 2025-09-12 对 `packages/logic-core` 以及调用方所做的重构记录，目的在于：
- 把类型与核心状态/存档逻辑集中到 `packages/logic-core`，作为单一可信源；
- 消除模块级可变依赖，采用显式依赖注入（constructor DI）；
- 提供在 Node 环境下可用的持久化适配器与统一的日志接口，提升可移植性与可测性；
- 保留向后兼容点，减少一次性大改动对其他模块和测试的冲击。

变更要点（摘要）:
- 将原先分散在 `apps/game` 的类型和核心逻辑归并到 `packages/logic-core/src/`（例如 `types.ts`, `state.ts`, `save-manager.ts`）。
- 删除了模块级可变的 `dataManager` 依赖，改为在 `GameStateManager` 构造器中注入 `dataManager`（默认仍为包内实现）。
- `createInitialState` 由实例方法实现，同时保留了一个向后兼容的静态包装器以避免大量调用点立刻改动。
- `SaveManager` 重构：接受可注入的 `StorageLike` 和 `ILogger`，并在包内提供 `FileStorage`（Node 文件系统适配器）与默认 logger 实现。
- 新增 `ILogger` 接口与 `getLogger` / `setLogger` 全局 API，提供浏览器与 Node 的控制台前缀实现。
- 将若干调用点改为显式实例化：把 `GameStateManager.createInitialState(...)` 的静态调用替换为 `new GameStateManager(...).createInitialState(...)`。
- 改进了 `GameScene` 与 `SceneManager`：`GameScene` 现在可通过构造器接收 `GameStateManager` 实例；`SceneManager` 创建并共享一个 `GameStateManager` 实例传入场景，统一状态管理实例。
- 为了兼容测试用例（vitest 的 mock 行为），保留了可通过构造器传入 mock `dataManager` 的路径，并在包内对某些边界情况添加了稳健的回退数据（避免因测试 stub 不完整导致的运行时错误）。

受影响的主要文件（非穷举，示例）:
- packages/logic-core/src/types.ts (集中类型)
- packages/logic-core/src/data-manager.ts
- packages/logic-core/src/state.ts (GameStateManager 重构，constructor DI，实例 createInitialState + static wrapper)
- packages/logic-core/src/save-manager.ts (接收 Storage/Logger，load/save/list 改造)
- packages/logic-core/src/logger.ts (ILogger + getLogger/setLogger)
- packages/logic-core/src/adapters/file-storage.ts (FileStorage for Node)
- apps/game/src/scenes/game-scene.ts (接受 GameStateManager 注入、使用实例 API)
- apps/game/src/scenes/scene-manager.ts (创建并传入共享 GameStateManager)
- apps/game/src/core/tests/* (若干测试调用点改为实例化形式以配合新 API)

验证与兼容性:
- 本地已运行整个工作区的 CI 风格测试：`pnpm -w run test:ci`，目前所有包的测试均通过。
- 为降低迁移成本，保留了静态包装器 API，使得未立即迁移的调用站点仍能工作；同时建议后续逐步迁移到显式注入以消除全局副作用。

后续建议（短期）:
- 在 README 或 CONTRIBUTING 中记录新的使用方式：如何注入 `dataManager`、如何在 Node 环境下使用 `FileStorage`、如何设置全局 logger。
- 将 `GameScene` / `SceneManager` 的改动纳入一次小的重构 PR 注释，说明向后兼容策略及未来移除静态包装器的计划。

后续建议（长期）:
- 完全移除对包名运行时导入（dynamic import）的依赖，依赖显式注入与静态相对导入，减少构建/测试时对 `dist` 的依赖。
- 考虑把更多可变环境（Storage、Logger、DataSource）从单例迁移到显式上下文对象，方便服务端/离线/在线多环境运行。

变更作者: 自动化重构脚本 + 开发者交互（见 Git 历史以获取逐行提交信息）