# AI Architect — Claude Code Instructions

## Purpose
Converts natural language into valid, executable ComfyUI workflow JSON.
Single-page React app + Electron shell + standalone MCP server.

## Stack
| Layer | Technology |
|---|---|
| Frontend | React 18.3.1, TypeScript 5.5, Vite 6.3.5 |
| Desktop | Electron 36 (NSIS installer, Windows) |
| Graph UI | ReactFlow v11.11.4, @dagrejs/dagre |
| Styling | Tailwind CSS v4, Radix UI, shadcn/ui |
| AI Providers | Anthropic, OpenAI, Gemini, OpenRouter |
| MCP Server | TypeScript + @modelcontextprotocol/sdk |
| Package Manager | pnpm (webapp), npm (mcp-server) |
| State | React hooks + localStorage only |

## Project Layout
```
webapp/               → React + Vite SPA + Electron shell
  src/
    app/App.tsx       → Entry component (3 300+ lines — READ before touching)
    app/components/workflow-architect/  → 44 active UI panels
    services/         → 50 business logic files
    data/             → Hardcoded node registry, prompts, model DB
    hooks/            → 21 custom React hooks
    utils/            → Graph layout, export/import helpers
    types/comfyui.ts  → Canonical TypeScript interfaces
  electron/main.cjs   → Electron main process
mcp-server/           → MCP server (separate Node project)
scripts/              → PowerShell bootstrap/health-check
comfyui-paths.config.json  → Central path config (ComfyUI root, models, ports)
.env.secret           → Local secrets (NOT committed)
```

## Critical Rules

### Never do this
- **Do not** create or reference `tailwind.config.js` — Tailwind v4 is CSS-only.
- **Do not** import from `@xyflow/react` — use `"reactflow"` (v11 API).
- **Do not** assume file contents without reading first — App.tsx was previously corrupted by automated tooling.
- **Do not** run `npm install` in `webapp/` — use `pnpm` exclusively.
- **Do not** add Redux, Zustand, or any global state library — hooks + localStorage is intentional.
- **Do not** add a backend server or database — zero-backend architecture is a design constraint.
- **Do not** write light-mode styles — dark theme only (`bg-[#0a0a0a]`).
- **Do not** commit `.env.secret` or `comfyui-startup-log.txt`.

### Always do this
- Read a file before editing it.
- Run `pnpm build` in `webapp/` after non-trivial TypeScript changes to catch type errors.
- Keep the MCP server and webapp as separate Node projects — do not merge package.jsons.
- Use `@/*` path alias for all webapp imports (maps to `webapp/src/*`).
- Validate workflow JSON against ComfyUI's `/object_info` schema, not a static schema.

## Architecture Notes

### 5-Phase ComfyUI Backend
1. **Connect → Sync** — `/object_info` fetch, node registry hydration
2. **Execute → View** — WebSocket prompt submission, real-time progress
3. **Model Awareness** — `/models` inventory, missing-model detection
4. **Live Debugging** — Validation pipeline, auto-correction loop
5. **Experiment Engine** — Parameter sweeps across workflow variants

### Hostname Alignment
`alignHostname()` in `services/comfyui-backend.ts` rewrites `localhost ↔ 127.0.0.1` to avoid browser mixed-content blocks. Always route ComfyUI calls through it.

### Vite Proxy
`/comfyui-proxy` → `http://127.0.0.1:8188` (configured in `vite.config.ts`)

### Electron
`electron/main.cjs` loads the built Vite output via `file://`. The `comfyui-paths.config.json` is bundled as an extra resource.

## Dev Commands
```bash
# Webapp
cd webapp && pnpm dev              # Vite dev server → http://127.0.0.1:5173
cd webapp && pnpm electron:dev     # Electron + Vite together
cd webapp && pnpm build            # Production build
cd webapp && pnpm electron:build   # NSIS installer

# MCP Server
cd mcp-server && npm run dev       # Dev mode (tsx)
cd mcp-server && npm run build     # Compile TypeScript
```
