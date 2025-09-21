# Plan 042: Monstereditor Agent Initialization

## 1. Understanding
- Initialize the Monster Editor agent using Gemini via the latest `google/genai` library (not the deprecated `generative-ai`).
- Provide backend support for streamed, multi-turn conversations with task reset (`newTask`).
- Persist system instructions separately in `apps/monstereditor/prompts/system.md` with the supplied persona text.
- Load configuration (Gemini key/model plus HTTP(S) proxy) from environment variables, supporting `.env` loading.
- Use `undici` to configure outbound HTTP(S) proxying for the Gemini client.
- Ensure both backend and frontend support server-sent events (SSE) for streaming replies.
- Update project documentation: `jules.md` (core knowledge) and, if required, `agents.md` per repository protocol.

## 2. Goals
1. Backend foundation for the agent:
   - Gemini client wiring with env-driven config and optional HTTP/S proxy support via `undici`.
   - SSE response pipeline exposing chat history management, including `newTask` reset.
2. Frontend scaffolding:
   - UI elements for `newTask`, chat log display, input field, and send button.
   - SSE consumption to render streaming agent replies and maintain conversation history.
3. Shared resources:
   - `prompts/system.md` created with the provided system instruction text.
   - `.env` template or documentation for new environment variables.
4. Documentation deliverables: update `jules.md`, create `plan042-report.md` after implementation, and adjust `agents.md` if expectations for agents change.

## 3. Task Breakdown
1. **Audit & Prep**
   - Inspect current monstereditor codebase for existing agent placeholders.
   - Identify config loading patterns (dotenv, runtime utilities).
2. **Prompts & Config**
   - Add `apps/monstereditor/prompts/system.md` with the specified persona.
   - Introduce `.env` handling (likely via `dotenv`) and document expected variables (`GEMINI_API_KEY`, `GEMINI_MODEL`, `HTTP_PROXY`, `HTTPS_PROXY`).
3. **Backend Agent Module**
   - Implement agent controller/service using `google/genai`.
   - Configure `undici` dispatcher for proxy support.
   - Expose SSE endpoint(s) handling chat history and `newTask` resets.
4. **Frontend Agent UI**
   - Create components or scripts for chat area, streaming consumption via `EventSource`, and reset button.
   - Manage client-side conversation history synced with server resets.
5. **Integration & Validation**
   - Wire frontend actions to backend endpoints.
   - Smoke-test locally (where possible) to ensure SSE flow works with mock or stub data if the real API cannot be exercised.
6. **Documentation & Reports**
   - Update `jules.md` with the new agent module overview and key setup steps.
   - Update `agents.md` if workflows for agents change.
   - Author `jules/plan042-report.md` after completion summarizing execution and decisions.

## 4. Risks & Mitigations
- **Gemini API availability**: If live calls are impossible locally, add clear TODOs or fallbacks, focus on scaffolding.
- **SSE integration complexity**: Test with mocked streaming responses to ensure UI handles chunks correctly.
- **Proxy configuration edge cases**: Provide guarded setup so absence of proxy variables does not break requests.

## 5. Definition of Done
- Backend serving SSE chat endpoint using Gemini via `google/genai`, respecting env config and reset semantics.
- Frontend renders basic agent UI with streaming updates and `newTask` functionality.
- Persona prompt stored under `prompts/system.md`.
- Relevant docs updated; plan report drafted post-implementation.
