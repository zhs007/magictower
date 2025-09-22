# Repository Guidelines

## Project Structure & Module Organization
Monorepo managed by Turborepo and pnpm. Runtime client lives in `apps/game` (Pixi.js renderer, UI, assets). Core rules, state models, and shared types live in `packages/logic-core`; keep framework-agnostic logic there. Rendering helpers and entity abstractions reside in `packages/maprender`. Support editors (map, level data, monster) sit under `apps/` with their own dev commands. Automation scripts belong in `scripts/`, and long-form plans plus reports belong in `jules/`. Python-based services (e.g., `services/rmbg`) run independently via Docker.

## Build, Test, and Development Commands
Run `pnpm install` once per workspace to sync dependencies. Use `pnpm dev` for the primary game client; `pnpm dev:maprender` and editor-specific commands spin up auxiliary tooling. Execute `pnpm build` to run all package builds through Turbo. Favor `pnpm check` for the aggregated lint/type/test pipeline before sharing work. For map utilities, use `pnpm gen-map` or `pnpm gen-map:v2` as indicated in plan documents.

## Coding Style & Naming Conventions
TypeScript-first codebase with strict typings. Follow ESLint (`pnpm lint`) and Prettier (`pnpm format`) outputs without manual tweaks. Prefer descriptive camelCase for variables/functions, PascalCase for classes, and kebab-case for files. Keep action logic in `Entity` subclasses and avoid side effects in shared libraries. Add JSDoc to exported APIs or non-obvious routines.

## Testing Guidelines
Unit tests rely on Vitest; run `pnpm test` (or targeted `-- --watch`) from the repo root. Maintain high coverage in `packages/logic-core`, especially around new actions or state transitions. Name spec files `*.test.ts` alongside the code under test. When adding scripts, keep the runner thin so core functions remain mockable.

## Commit & Pull Request Guidelines
Follow the existing Conventional Commit style (`feat:`, `refactor:`, `fix:`). Each PR should reference the relevant `jules/planXXX.md`, describe scope, and include screenshots or GIFs for visual changes. Ensure `pnpm check` passes, note any coverage deltas, and flag migrations or config changes explicitly.

## Agent Workflow Notes
Consult the latest plan in `jules.md` before coding. After completing assigned work, author a `jules/planXXX-report.md` entry and update `jules.md` status. Log major agent actions under "Agent Activity Log" within this file when applicable.

## Monstereditor Agent
- Gemini integration uses `@google/genai`; configure credentials via `.env` (`GEMINI_API_KEY`, `GEMINI_MODEL`) plus optional `HTTP_PROXY` / `HTTPS_PROXY`.
- Copy `apps/monstereditor/.env.example` to `.env` (same folder) for the expected variable list before running local servers; root-level `.env` files are still respected but optional.
- System instructions live in `apps/monstereditor/prompts/system.md`; keep persona changes synchronized there.
- Backend exposes `POST /api/agent/new-task` to reset conversations and `GET /api/agent/stream` for SSE replies (`start`/`chunk`/`done`/`agent-error`).
- Frontend chat UI (`apps/monstereditor/src/client/agent.ts`) manages EventSource streaming—avoid breaking basic controls (`New Task`, send, live updates) when iterating.
- **Agent Logic**: The agent backend (`apps/monstereditor/src/agent/routes.ts`) uses a **tool-calling loop**. It does not stream responses directly from the model. Instead, it receives a complete response, checks for a `functionCall`, executes the corresponding local function in `tools.ts`, sends the result back to the model, and only then streams the final natural-language response to the client. When modifying the agent, ensure this loop remains intact.
