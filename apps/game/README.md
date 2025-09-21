# @proj-tower/game — notes

This package contains the game frontend logic and tests.

## DataManager.loadAllData overrides

`DataManager.loadAllData` accepts an optional `overrides` object so tests (or debug scripts)
can inject data directly instead of relying on runtime `import.meta.glob` or Vite path
normalization.

Usage example in tests:

```ts
import { dataManager } from './src/data/data-manager';

const playerFixture = {
    id: 'player',
    name: 'TestHero',
    level: 1,
    exp: 0,
    hp: 100,
    keys: { yellow: 0, blue: 0, red: 0 },
};

const levelFixture = [
    { level: 1, exp_needed: 0, maxhp: 100, attack: 10, defense: 10, speed: 10 },
    { level: 2, exp_needed: 100, maxhp: 120, attack: 12, defense: 12, speed: 11 },
];

beforeEach(async () => {
    // Inject only player and level data. Other datasets will be loaded from
    // the repository as usual unless provided in `overrides`.
    await dataManager.loadAllData({
        playerData: playerFixture,
        levelData: levelFixture,
    });
});
```

Overrides shape (all fields optional):

- `monsters`, `items`, `equipments`, `buffs`, `maps`: module-like records matching
  the shape returned by `import.meta.glob(..., { eager: true })`.
- `playerData`: PlayerData object
- `levelData`: LevelData[] array

Why this exists

- Vitest/Vite may normalize module specifiers differently between test runs and dev
  server, causing fragile tests when they rely on repo-root path aliases or
  import.meta.glob module ids. Using the `overrides` parameter makes tests
  deterministic and avoids mocking at the module id level.

Notes

- Prefer injecting only what a test needs and let the code load the rest
  normally to keep fixtures small and focused.
