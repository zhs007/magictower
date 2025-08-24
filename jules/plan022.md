1.  **Fix `tsconfig.json`:** Add `"resolveJsonModule": true` to `compilerOptions` to fix the module import errors in `data-manager.ts`.
2.  **Fix `calculateFinalStats` return type:**
    *   Locate the `CalculableStats` type definition and the `calculateFinalStats` function in `src/core/stat-calculator.ts`.
    *   Update both to correctly handle and return `maxhp`, `level`, and `exp`.
3.  **Fix Mock Objects in `plan021.test.ts`:** Update the mock `GameState` to be a complete object to resolve the `TS2352` conversion errors.
4.  **Fix Mock Objects in Other Test Files:**
    *   Go through each remaining test file listed in the error output (`damage.test.ts`, `logic.test.ts`, `new_logic.test.ts`, `plan009.test.ts`, `plan015.test.ts`, `state.test.ts`, `plan014.test.ts`).
    *   Update the mock `IPlayer` and `IMonster` objects to include the new required properties (`level`, `maxhp`, `exp`).
5.  **Final Verification:** After applying all fixes, run `npm run check` again to ensure all errors are resolved.
6.  **Submit the fix:** Once all checks pass, I will submit the changes.
