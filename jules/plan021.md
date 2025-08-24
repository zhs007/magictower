1.  ***Project Setup & Plan Creation***
    *   Create the plan file `jules/plan021.md` with the detailed steps of this task.
    *   Install dependencies using `npm install`.

2.  ***Data Model & Type Updates***
    *   Modify `src/core/types.ts`:
        *   Add `maxhp: number` and `level: number` to the `ICharacter` interface.
        *   Add `exp: number` to the `IPlayer` interface.
    *   Modify `src/data/types.ts`:
        *   Create `IPlayerData` to represent the structure of `playerdata.json`.
        *   Create `ILevelData` to represent the structure of `leveldata.json`.
        *   Add `maxhp: number` and `level: number` to `MonsterData`.

3.  ***Game Data Creation***
    *   Create `gamedata/playerdata.json` with initial player stats, including `level`, `exp`, and `maxhp`.
    *   Create `gamedata/leveldata.json` with the experience thresholds and stat gains for each level. The table will define stat values *per level*, not just the increase.
    *   Update all monster files in `gamedata/monsters/` to include `maxhp` and `level`. `maxhp` should be the same as `hp` for now and a multiple of 10. `level` will be set to 1 for all existing monsters.

4.  ***Data Loading***
    *   Modify `src/data/data-manager.ts`:
        *   Add properties to hold player and level data.
        *   Load `playerdata.json` and `leveldata.json` into the new properties.
        *   Create getter methods for the new data.

5.  ***Core Logic Implementation***
    *   Modify `src/core/logic.ts`:
        *   In `handleEndBattle`, when the player wins:
            *   Calculate `reward_exp` for the defeated monster: `(monster.maxhp / 10) + monster.attack + monster.defense + monster.speed`.
            *   Add `reward_exp` to the player's `exp`.
            *   Implement a new `levelUp` function that is called after gaining experience.
        *   Create the `levelUp(player, levelData)` function:
            *   It will check if the player's `exp` is sufficient for the next level based on `leveldata.json`.
            *   If a level-up occurs, it will update the player's stats by calculating the difference between the new level's stats and the old one.
            *   Set `player.hp` to `player.maxhp`.
            *   The function should handle multiple level-ups at once if a large amount of EXP is gained.
    *   Modify `src/core/state.ts` to use `playerdata.json` for the initial player state.

6.  ***UI Updates***
    *   Modify `src/renderer/ui/hud.ts` to display the player's `level`, `exp`, and `maxhp`. The EXP display should show `(current_exp - current_level_threshold) / (next_level_threshold - current_level_threshold)`.

7.  ***Testing***
    *   Create a new test file `src/core/tests/plan021.test.ts`.
    *   Write unit tests for:
        *   `reward_exp` calculation.
        *   Player gaining experience after battle.
        *   Player leveling up correctly (stats, hp restored).
        *   Handling of multiple level-ups.
        *   Correct loading of new data files.
    *   Run all tests using `npm test` and ensure they pass.

8.  ***Documentation & Reporting***
    *   Create the final report `jules/plan021-report.md`.
    *   Update `jules.md` to reflect the completion of this plan and add documentation for the new level and experience system.
