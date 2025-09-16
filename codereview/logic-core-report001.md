# Code Review: packages/logic-core

Repository: magictower
Branch: main
Commit: 95a7f3f (95a7f3f3d8750a12ba00b5cb0278246811e9878b)
Last commit:
commit: 95a7f3f3d8750a12ba00b5cb0278246811e9878b
author: Zerro Zhao <sssxueren@gmail.com>
date: Tue Sep 16 18:55:01 2025 +0800
subject: Merge pull request #45 from zhs007/feat/map-editor-1

Date of review: 2025-09-16

Summary
-------
This report covers a focused code review of the `packages/logic-core` package. I examined source files under `packages/logic-core/src`, ran the TypeScript build, and executed unit tests. The build completed and all unit tests passed (24 tests).

Quick status
------------
- TypeScript build: OK
- Unit tests: 24 passed, 0 failed
- Notable findings: minor API and typing inconsistencies, a few fragile assumptions in logic, and several places that would benefit from clearer error handling or comments.

Files reviewed
--------------
- packages/logic-core/package.json
- packages/logic-core/src/index.ts
- packages/logic-core/src/types.ts
- packages/logic-core/src/logic.ts
- packages/logic-core/src/state.ts
- packages/logic-core/src/stat-calculator.ts
- packages/logic-core/src/equipment-manager.ts
- packages/logic-core/src/data-manager.ts
- packages/logic-core/src/save-manager.ts
- packages/logic-core/src/logger.ts

Test / CI
---------
Command run:
- pnpm --filter @proj-tower/logic-core run build
- pnpm --filter @proj-tower/logic-core run test

Results:
- Build: tsc -b finished with no errors
- Tests: vitest run -> 5 test files, 24 tests passed

Detailed findings and recommendations
-----------------------------------
I grouped findings by area: types & API, logic correctness, robustness, and code style.

1) Types & API
- `types.ts` is comprehensive and documents many shapes used by the package. Good use of explicit interfaces and enums.
- InteractionState union covers expected states but uses literal strings for `turn` that include 'battle_end' inside the same union as 'player'/'monster'. Consider making `turn` a separate narrower union so the type of the object is clearer when `turn` is 'battle_end' vs when it is a normal flow. Example: separate BattleState vs NonBattle states.
- Several files use `Record<string, any>` for `entities` (e.g. GameState.entities). This reduces type safety. If possible, narrow `entities` to a discriminated union mapping to `IEntity` or similar.
- `calculateFinalStats` returns `{ maxhp, level, exp }` in addition to the computed stats. The comment in the code suggests monsters don't have exp, but using `(character as any).exp ?? 0` is brittle. Consider adding a small helper type or safe getter function to make intent explicit.

2) Logic correctness and edge cases
- handleMove
  - The function clones state with lodash's `cloneDeep` which is safe but can be heavy; for performance-critical paths consider a shallow copy strategy and immutable updates only for changed branches.
  - The movement logic handles turning-in-place vs movement which is good. A few edge cases to note:
    - When checking for collision the code uses `newState.map[0].length` to infer width. If the map rows are ragged this may throw or produce incorrect checks. Prefer using a stored width or checking against `newState.map[newY]?.length` with guard.
    - When an entity exists at the destination the code checks `newState.items[destinationEntityKey]` and `newState.stairs[destinationEntityKey]`. This works but can be brittle if entities are registered inconsistently. Consider using a small helper (e.g. `getEntityKeyAt(state, x, y)`) to centralize the logic.
    - The function returns the original `state` object in some error branches (e.g. collision). This is fine, but callers should be aware that identity equality may be used to detect no-op. Document this behavior.

- handlePickupEquipment
  - Using `compareEquipment` to decide auto-equip vs discard is good. A few notes:
    - The code uses `as any` when setting the `interactionState` for equipment pickup in `handleMove` and when returning action payloads. Prefer narrowing the interaction state or adding a new clearly typed variant to avoid `any`.
    - When `comparison.oldItem` is an array the code pushes elements to `player.backupEquipment`. The `backupEquipment` type is `(IEquipment | undefined)[]`; consider normalizing to `IEquipment[]` to avoid `undefined` elements.

- handleUseBomb
  - The function searches `newState.player.specialItems?.indexOf('bomb')` but compares against `undefined` and `-1` separately. `indexOf` returns -1 when not found; the check `if (bombIndex === undefined || bombIndex === -1)` is harmless but misleading. Prefer `if (bombIndex === -1)` or `if (bombIndex < 0)`.
  - Removing monsters also loops over `entities` to find the matching entity key via `id` equality. This assumes entity entries set `id` to the monster id. Consider adding an index map or a helper for fast lookup.

- calculateDamage / calculateFinalStats
  - `calculateFinalStats` uses `character.hp` as part of baseStats, which mixes current and base stats. Consider using `character.maxhp` as the base stat for HP calculations and keeping `hp` strictly as current HP.
  - The function floors percent bonuses (`Math.floor(baseValue * percentValue)`). This is fine, but document rounding behavior and whether percentages are expressed as 0.1 == +10%.

- handleStartBattle / handleAttack / handleEndBattle
  - Battle turn resolution logic is straightforward and covered by tests. A couple of observations:
    - `handleAttack` uses `playerEntityKey` as the identity to compare `attackerId` and `defenderId`. This relies on map entity keys matching the IDs passed to action objects. Document this contract clearly in the README or types.
    - `handleAttack` mutates `interactionState` and relies on fields like `playerHp` and `monsterHp` existing. It assumes `interactionState.type === 'battle'` earlier, but later code sometimes checks `newState.interactionState.type !== 'battle'` — be consistent and consider narrowing type with a type guard before mutating.
    - `MAX_COMBAT_ROUNDS` is a small constant; if it's a gameplay tuning variable consider exporting it or moving to config.

3) DataManager
- `DataManager.loadAllData` uses `import.meta.glob` with eager imports which works for Vite-based builds. Tests use override injection which is good. A couple of suggestions:
  - The `loadDataFromModuleGroup` function mutates `data` objects in-place (e.g. sets `data.type` when missing). Prefer creating a shallow copy when normalizing to avoid surprising shared-module mutations.
  - The fallback registration by filename is helpful, but swallowing all exceptions silently may hide mapping errors. At least log a debug-level message on unknown registration shapes.

4) SaveManager
- The save/load design (store initial seed + action log) is robust and allows deterministic replays.
- `SaveManager.loadGame` calls `createInitialState` without passing `dataManager` overrides; if the environment that wrote the save used different data modules (e.g., modded content) loading may not reproduce the original without a way to inject consistent data. Consider storing a data version or a checksum in the save metadata.
- `SaveManager` uses `globalThis.localStorage` by default and the tests include file-storage adapters which is good.

5) Tests and Quality
- Tests pass locally. The test coverage appears focused on critical logic paths (damage calc, state transitions, save/load).
- Consider adding tests for these cases:
  - Equip swap behavior for two-handed vs one-handed weapons including backup equipment edge cases.
  - handleMove when map rows are ragged or when entities are malformed.
  - SaveManager.loadGame when save data references unknown entity IDs (corrupt save).

6) Small fixes & low-risk improvements (suggested PRs)
- Replace `indexOf` + `undefined` checks in `handleUseBomb` and `handleUsePotion` with explicit `index === -1` checks.
- Add a helper `getEntityKeyAt(state, x, y)` to centralize entity lookup logic used in `handleMove` and other handlers.
- Narrow `GameState.entities` type from `Record<string, any>` to `Record<string, IEntity | { type: string }>` or similar.
- Add a comment/docstring to `calculateFinalStats` clarifying which field is base vs current HP and include an example.
- Make `MAX_COMBAT_ROUNDS` exportable or configurable.

7) Larger follow-ups (worth a plan)
- Introduce a small runtime validation step on loaded map JSON to verify entity IDs referenced in the layout are present in data maps; surface clear errors during development so map typos are caught early.
- Replace deep cloning with a structural update helper to reduce GC pressure and improve performance during frequent state updates.
- Add more explicit type guards for `interactionState` variants to avoid runtime panics when fields are missing.

Conclusion
----------
`packages/logic-core` is well-structured, well-tested, and generally easy to follow. The public API exported from `src/index.ts` is clear and modular. The issues found are mostly low-risk and focused on type-safety, small clarity fixes, and defensive checks that will make the package more robust for modding and long-term maintenance.

Requirements coverage
---------------------
- Build: Done (PASS)
- Tests: Done (24 tests PASS)
- Code review document: Done (this file)

Next steps I can take if you want
--------------------------------
- Open PR(s) implementing the small fixes (indexOf checks, helper for entity lookup, narrow entities typing).
- Add the suggested unit tests (equip swap edge cases, ragged map movement, corrupted save load).

