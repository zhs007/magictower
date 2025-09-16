# Development setup (quick)

This file lists a few quick steps to get the workspace typed and the Map Editor running locally.

1. Make sure workspace dependencies are installed:

   ```bash
   pnpm install
   ```

2. Build library packages (needed once or when types change):

   ```bash
   pnpm run prepare:dev
   # this builds @proj-tower/logic-core and @proj-tower/maprender
   ```

3. Start Map Editor dev server (builds dependencies first):

   ```bash
   pnpm run dev:mapeditor:ready
   ```

4. If the editor (VS Code) still shows type errors after the above steps, restart the TypeScript server:

   - Open the Command Palette (⇧⌘P / Ctrl+Shift+P)
   - Run: `TypeScript: Restart TS Server`

5. CI recommendation

   - In CI, ensure library packages are built before running typechecks or consumer builds. Example sequence:

     ```bash
     pnpm -w -F @proj-tower/logic-core run build
     pnpm -w -F @proj-tower/maprender run build
     pnpm -w -r exec tsc --noEmit
     ```

That's it — these steps make the editor and typechecker resolve workspace packages reliably.

CI: GitHub Actions runs `pnpm run check` (which triggers build, typecheck, lint and tests via Turborepo) for PRs to `main`.

The repository's consolidated CI workflow is `.github/workflows/ci.yml` which caches pnpm and Turbo, runs the full check (build/typecheck/lint/tests), executes tests with coverage, and uploads `coverage` and `test-results` directories as workflow artifacts.
