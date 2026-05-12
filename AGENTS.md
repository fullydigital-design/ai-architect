# AI Architect — Agent Conventions

## Project Identity
- Repo: `E:\_AI\AI_architect`
- Package manager: **pnpm** (webapp), **npm** (mcp-server)
- Runtime: Node 20+
- Platform: Windows 11 primary; Electron targets Windows/Mac/Linux

## Before You Touch Any File
1. **Read it first** — App.tsx (3 300+ lines) and large service files have layered state.
2. **Check imports** — ReactFlow v11 imports from `"reactflow"`, not `"@xyflow/react"`.
3. **Check Tailwind** — v4 CSS-only; no `tailwind.config.js` exists or should exist.

## File Modification Protocol
- Edit the smallest surface area that fixes the problem.
- Do not refactor surrounding code unless explicitly asked.
- Do not add comments to code you did not change.
- Do not introduce new dependencies without asking.

## TypeScript Conventions
- All shared types live in `webapp/src/types/comfyui.ts` — extend there, do not shadow locally.
- Use `@/*` alias for all webapp imports (`@/services/...`, `@/hooks/...`, etc.).
- `strict: true` is enforced — no `any` escape hatches without justification.

## React Conventions
- Dark theme only: base background is `bg-[#0a0a0a]`.
- Radix UI primitives + shadcn/ui wrappers — do not reimplement them.
- State: React hooks + localStorage. No external state library.
- Component files in `webapp/src/app/components/workflow-architect/`.

## Service Layer (`webapp/src/services/`)
- Each service is a singleton module — no class instantiation.
- ComfyUI API calls go through `comfyui-backend.ts` (handles hostname alignment).
- Workflow execution goes through `comfyui-execution.ts` (WebSocket manager).
- All AI provider calls go through `ai-provider.ts`.

## MCP Server (`mcp-server/`)
- Separate Node project — do not import from `webapp/src`.
- Build before testing: `npm run build` → `dist/index.js`.
- Config via env: `COMFY_BASE_URL`, `ARCHITECT_URL`.

## Paths and Config
- Central path config: `comfyui-paths.config.json` (ComfyUI root, models dir, ports).
- Secrets: `.env.secret` (never committed). Template: `.env.secret.example`.
- Never hardcode `C:\Users\M\...` or machine-specific paths in source code.

## What Not to Generate
- No `tailwind.config.js`
- No `redux`, `zustand`, `mobx`, or equivalent
- No Express/Fastify/Hono server inside webapp
- No light-mode CSS
- No `@xyflow/react` imports
- No new top-level directories without explicit approval

## Testing
- No test framework is currently configured.
- Before claiming a UI change works: verify in browser at `http://127.0.0.1:5173`.
- Type-check: `cd webapp && pnpm build` (tsc errors surface here).

## Git
- Branch: `master` tracking `origin/main`
- Do not force-push.
- Do not commit: `.env.secret`, `comfyui-startup-log.txt`, `desktop.ini`

## Two-Chat Workflow (master brainstorm + executor)

Ported from velvet-research / velvet-monitor. One brainstorm chat plans, one executor chat ships.

- **Brainstorm chat** writes/updates: `docs/SESSION_STATE.md`, `docs/plan_<phase>.md`, `docs/instructions/<phase>_executor.md`, root memory.
- **Executor chat** writes only: `docs/tests/<phase>_<ts>.md` per phase + one `DEVLOG.md` entry per session. Never touches `SESSION_STATE.md`, `CLAUDE.md`, `AGENTS.md`, or memory.
- **Trigger phrase to open an executor chat:** start the new chat with `executor chat — load instructions`. It will read [`docs/handoff_executor.md`](docs/handoff_executor.md) which lists the read-order.
- **Current queue:** see [`docs/SESSION_STATE.md`](docs/SESSION_STATE.md) §Queue.
- **Test report template:** [`docs/tests/_TEMPLATE.md`](docs/tests/_TEMPLATE.md).
