# 计划 010: 装备与增益效果系统 (Equipment & Buff System)

## 目标

为游戏引入装备（Equipment）和增益/减益效果（Buff）两个核心系统。这会极大地丰富游戏的策略深度，允许玩家通过搭配不同的装备和利用各种 Buff 来应对挑战。

## 主要任务

1.  **重构核心类型 (`src/core/types.ts`)**:
    - 创建 `IBaseObject` 作为所有游戏对象（玩家、怪物、道具等）的基类，包含 `id` 和 `name`。
    - 创建 `ICharacter` 接口，继承自 `IBaseObject`，包含 `hp`, `attack`, `defense`, `x`, `y` 等角色通用属性。
    - 定义 `IEquipment` 接口，包含 `slot`, `attackBonus`, `defenseBonus`, `weaponType` (单手/双手) 等字段。
    - 定义 `IBuff` 接口，包含 `duration` (持续时间), `charges` (生效次数), `triggers` (触发时机，如 `ON_BATTLE_START`) 等字段。
    - 修改 `IPlayer` 和 `IMonster`，使其继承自 `ICharacter`，并添加 `equipment` (5个装备槽), `backupEquipment` (备用装备) 和 `buffs` (Buff列表) 属性。
    - 更新 `GameState` 以包含 `equipments` 的全局记录。

2.  **创建数据配置文件**:
    - 在 `gamedata/` 下创建 `equipments/` 和 `buffs/` 目录。
    - 创建示例装备 JSON 文件，如 `broadsword.json` (+20 攻击), `steel_armor.json` (+50 防御), `longbow.json` (双手武器)。
    - 创建示例 Buff JSON 文件，如 `first_strike.json` (战斗开始时先攻), `life_saving.json` (HP归零时免死一次)。
    - 统一所有数据文件的 `id` 格式为 `type_id` (e.g., `monster_green_slime`, `eq_broadsword`)。

3.  **更新数据加载器 (`src/data/data-manager.ts`)**:
    - 修改 `DataManager` 以加载 `equipments` 和 `buffs` 目录下的所有 JSON 文件。

4.  **实现装备与 Buff 的核心逻辑 (`src/core/logic.ts`)**:
    - **战斗逻辑**:
        - 修改 `calculateBattleOutcome` 函数，使其在计算伤害时，将角色的基础属性与装备提供的属性加成相加。
        - 实现 "First Strike" Buff 逻辑：在战斗开始时，拥有此 Buff 的一方可以先攻击一次。
        - 实现 "Life Saving" Buff 逻辑：在角色 HP 降至0或以下时，如果拥有此 Buff，则 HP 恢复到 1，并消耗一次 Buff。
    - **装备逻辑 (待办)**:
        - 创建 `equipItem(character, equipment)` 函数，处理装备穿戴逻辑。
        - 实现规则：当装备双手武器时，自动卸下另一只手的装备。
    - **拾取逻辑 (待办)**:
        - 修改 `handlePickupItem` 函数，使其支持拾取地上的装备。

5.  **编写与更新测试 (`src/core/tests/logic.test.ts`)**:
    - 更新所有现存测试，以适应新的 `ICharacter` 和 `GameState` 数据结构。
    - **(待办)** 添加新的单元测试，专门验证 Buff（先攻、保命）和装备（双手武器）的逻辑是否正确。

## 验收标准

- `IPlayer` 和 `IMonster` 的数据结构成功扩展，包含了装备和 Buff。
- `DataManager` 能够成功加载所有装备和 Buff 的数据。
- 战斗伤害计算能正确地反映装备的属性加成。
- "First Strike" 和 "Life Saving" Buff 在战斗中按预期生效。
- (未来) 装备穿戴和拾取逻辑符合设计要求。
- 所有相关逻辑都有单元测试覆盖，且所有测试都能通过。
