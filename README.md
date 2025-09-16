# Project Tower (魔塔)

[English](#project-tower-魔塔) | [中文](#project-tower-魔塔-1)

A web-based, "Magic Tower" style RPG developed with TypeScript and Pixi.js. It is a deterministic game focused on strategic resource management.

## Project Description

This project is a classic "Magic Tower" (魔塔) game reimagined for the web. Players navigate a top-down maze, strategically defeating monsters, collecting items, and unlocking new floors. The game is designed with a "mobile-first" approach, featuring a portrait-mode UI.

A core principle of this project is its deterministic nature—there are no random elements. Every action a player takes will produce the exact same result every time, making strategy and planning paramount.

## Directory Structure

The project is a monorepo managed by `pnpm` and `Turborepo`.

```
.
├── apps/
│   └── game/            # The main game application
├── packages/
│   ├── logic-core/      # Shared, framework-agnostic game logic
│   └── maprender/       # Reusable map rendering component
├── gamedata/            # Global game data (monsters, items, etc.)
├── mapdata/             # Global map data
├── assets/              # Global static assets (images, sounds)
├── scripts/             # Helper scripts
├── package.json         # Root package.json
├── pnpm-workspace.yaml  # pnpm workspace configuration
└── turbo.json           # Turborepo configuration
```

## Code Structure

The project's architecture is designed to strictly separate game logic from rendering.

*   **`packages/logic-core`**: This package is the "brain" of the game. It contains all the core game rules (combat, item usage, player movement), stat calculation, and type definitions. It has **no dependency** on Pixi.js or any other rendering library.
*   **`packages/maprender`**: This package provides a reusable `MapRender` component for Pixi.js. It takes the game state and is responsible for drawing the map tiles and managing the z-order of all game entities (walls, characters, items) to create the 2.5D perspective.
*   **`apps/game`**: This is the main game application.
    *   **Data-Driven Design**: The game loads all entity data (monsters, items, etc.) and map layouts from the global `gamedata/` and `mapdata/` directories. This allows designers to tweak game balance and level design without touching the source code.
    *   **Renderer (`src/renderer/`)**: This module is responsible for all visual aspects of the game, using Pixi.js to draw the map, characters, and UI. It reads from the core game state but does not modify it directly.
    *   **Scene Management (`src/scenes/`)**: The `GameScene` acts as a controller, listening for player input, passing it to the `logic-core` to process, and then telling the `renderer` to update the display based on the new state.

This separation ensures that the game's rules are robust and testable in isolation, while the visual presentation can be developed and modified independently.

## Basic Usage

To get the project running locally, follow these steps:

1.  **Install dependencies:**
    ```bash
    pnpm install
    ```

2.  **Run the development server:**
    ```bash
    pnpm dev
    ```
    This will start a Vite development server for the `game` app, and you can access it in your browser at the provided URL (usually `http://localhost:5173`).

### Available pnpm Scripts

All scripts should be run from the repository root.

*   `pnpm dev`: Starts the development server.
*   `pnpm build`: Builds all packages and apps.
*   `pnpm test`: Runs all unit tests.
*   `pnpm lint`: Lints the entire codebase.
*   `pnpm check-gamedata`: Runs a validation script to check the balance and integrity of the game data.
*   `pnpm gen-map`: Runs the first version of the procedural map generator.
*   `pnpm gen-map:v2`: Runs the template-based v2 map generator.
*   `pnpm dev:mapeditor`: Starts the development server for the visual map editor.

## Core Game Logic

The game operates on a set of deterministic rules.

### Combat Logic

Combat is turn-based and fully predictable. The sequence of events is as follows:

1.  **Initiation**: Combat begins when the player attempts to move onto a tile occupied by a monster.
2.  **Attack Order**: The character with the higher **Speed** attribute attacks first. If speeds are equal, the player attacks first.
3.  **Damage Calculation**: The damage dealt per attack is calculated with the formula: `Damage = Attacker's Attack - Defender's Defense`. If the result is less than 1, the damage is 1.
4.  **Battle Resolution**: The characters attack each other in turns until one's HP drops to 0 or below. The total damage the player will receive from the entire battle is calculated upfront, and if the player would survive, the result is applied instantly. The player's HP is reduced, and the monster is removed from the map. If the player would not survive, the move is disallowed.

### Equipment Logic

The equipment system automatically manages gear upgrades to streamline the player experience.

*   **Attribute Modifiers**: Equipment can provide flat stat modifications (`stat_mods`, e.g., `attack: 10`) or percentage-based modifications (`percent_mods`, e.g., `attack: 0.1` for a 10% boost based on base stats).
*   **Auto-Equip Rules**:
    *   **Empty Slot**: New gear is automatically equipped if the slot is empty.
    *   **Pure Upgrade**: If the new item is strictly better than or equal to the currently equipped item across all stats, it is auto-equipped.
    *   **Pure Downgrade**: If the new item is strictly worse or equal, it is discarded.
    *   **Mixed Stats**: If the item offers both upgrades and downgrades (e.g., more attack but less defense), a confirmation dialog appears, showing the player the detailed stat changes.

---

# Project Tower (魔塔)

[English](#project-tower-魔塔) | [中文](#project-tower-魔塔-1)

一款使用 TypeScript 和 Pixi.js 开发的网页版“魔塔”类 RPG。这是一款确定性的、注重策略资源管理的游戏。

## 项目功能描述

本项目是一款经典的“魔塔”游戏，为网页端重新设计。玩家在俯视视角的迷宫中探索，通过策略性地击败怪物、收集道具和钥匙来不断挑战更高层。游戏专为竖屏移动设备优化，并采用无随机性的确定性设计，强调资源管理的策略规划。

## 项目目录结构

项目采用 `pnpm` 和 `Turborepo` 管理的 monorepo 结构。

```
.
├── apps/
│   └── game/            # 游戏主程序
├── packages/
│   ├── logic-core/      # 共享的、与框架无关的游戏逻辑
│   └── maprender/       # 可复用的地图渲染组件
├── gamedata/            # 全局游戏数据 (怪物、道具等)
├── mapdata/             # 全局地图数据
├── assets/              # 全局静态资源 (图片、声音等)
├── scripts/             # 辅助脚本
├── package.json         # 根 package.json
├── pnpm-workspace.yaml  # pnpm 工作区配置
└── turbo.json           # Turborepo 配置
```

## 项目代码结构

项目的顶层设计严格遵循“逻辑与渲染分离”的原则。

*   **`packages/logic-core`**: 这是游戏的“大脑”。它包含所有的核心游戏规则（战斗、道具使用、玩家移动）、属性计算和类型定义。它**不依赖**任何渲染库（如 Pixi.js）。
*   **`packages/maprender`**: 这个包提供了一个可复用的 `MapRender` 组件 (基于 Pixi.js)。它接收游戏状态，负责绘制地图瓦片，并管理所有游戏实体（墙体、角色、道具等）的 z-order，以实现 2.5D 的遮挡效果。
*   **`apps/game`**: 这是游戏的主程序。
    *   **数据驱动设计**: 游戏从全局的 `gamedata/` 和 `mapdata/` 目录加载所有实体数据和地图布局。
    *   **渲染器 (`src/renderer/`)**: 该模块负责游戏的所有视觉方面，使用 Pixi.js 绘制地图、角色和UI。它会读取核心游戏状态，但不会直接修改它。
    *   **场景管理 (`src/scenes/`)**: `GameScene` 作为一个控制器，监听玩家输入，将其传递给 `logic-core` 进行处理，然后根据新状态通知 `renderer` 更新显示。

这种分离确保了游戏规则的健壮性和可测试性，同时允许视觉表现层可以被独立开发和修改。

## 项目的基础使用说明

请按照以下步骤在本地运行项目：

1.  **安装依赖:**
    ```bash
    npm install
    ```

2.  **运行开发服务器:**
    ```bash
    npm run dev
    ```
    该命令会启动 Vite 开发服务器。你可以在浏览器中通过提示的 URL (通常是 `http://localhost:5173`) 来访问游戏。

### 主要 NPM 脚本

*   `npm run dev`: 启动 Vite 开发服务器。
*   `npm run build`: 构建用于生产环境的项目。
*   `npm run test`: 使用 Vitest 运行单元测试。
*   `npm run lint`: 对代码进行风格和错误检查。
*   `npm run check-gamedata`: 运行校验脚本，检查 `gamedata/` 目录下游戏数据的平衡性和完整性。
*   `npm run gen-map`: 运行v1版的程序化地图生成器。
*   `npm run gen-map:v2`: 运行基于模板的v2版地图生成器。
*   `npm run dev:mapeditor`: 启动可视化地图编辑器的开发服务器。

## 游戏核心算法说明

游戏运行在一套确定性的规则之上。

### 战斗逻辑

战斗是回合制的，并且结果完全可以预知。事件序列如下：

1.  **触发**: 当玩家试图移动到被怪物占据的图块时，战斗开始。
2.  **攻击顺序**: **速度 (Speed)** 属性更高的一方先攻击。如果速度相等，则玩家先攻击。
3.  **伤害计算**: 每次攻击造成的伤害按以下公式计算：`伤害 = 攻击方攻击力 - 防御方防御力`。如果结果小于1，则伤害为1。
4.  **战斗结算**: 双方轮流攻击，直到一方的生命值降至0或以下。玩家与怪物战斗的完整伤害会预先计算。如果玩家能存活，战斗结果会立刻生效：玩家的生命值被扣减，怪物从地图上消失。如果玩家无法存活，则该次移动会被禁止。

### 装备逻辑

为了简化玩家的操作，装备系统会自动管理装备的更替。

*   **属性加成**: 装备可以提供固定数值的属性加成 (`stat_mods`, 例如 `attack: 10`) 或基于角色基础属性的百分比加成 (`percent_mods`, 例如 `attack: 0.1` 表示增加10%的基础攻击力)。
*   **自动装备规则**:
    *   **空槽位**: 如果对应的装备槽是空的，则直接装备新物品。
    *   **纯粹提升**: 如果新装备提供的所有属性都 **优于或等于** 当前装备，则自动更换。
    *   **纯粹降低**: 如果新装备提供的所有属性都 **劣于或等于** 当前装备，则自动丢弃。
    *   **混合变化**: 如果新装备的属性有增有减（例如，攻击力更高但防御力更低），系统会 **弹出对话框**，显示详细的属性变化，由玩家决定是否更换。
