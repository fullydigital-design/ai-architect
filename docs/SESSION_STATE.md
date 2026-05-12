# Session State

Brainstorm-chat working file. Where we are right now.

---

## Status (2026-05-12, end of session)

Baseline is healthy:
- `cd webapp && pnpm exec tsc --noEmit` → exit 0
- `cd webapp && pnpm build` → exit 0
- Vite dev server starts cleanly

All `console.*` in `webapp/src/` route through `webapp/src/utils/logger.ts`. Debug/info/log drop in production; warn/error always pass through.

Repo committed at: see `git log -1`.

---

## What's still on the table (no rush)

- **Lint/format/test tooling** — no ESLint, Prettier, or Vitest yet. Per global CLAUDE.md tooling pre-flight rule, needs explicit user approval before install.
- **`any` types** — 287 occurrences across the codebase. Not blocking anything; tighten opportunistically.
- **`App.tsx` size** — 3 360 lines. Working but unwieldy. Decompose into Provider containers when there's appetite for a real refactor.
- **CI** — no GitHub Actions. Add typecheck + build gate when the rest stabilizes.
- **CLAUDE.md correction** — currently says "Type-check: `cd webapp && pnpm build`". That's wrong: `pnpm build` is `vite build` (esbuild, transpile-only). Real typecheck is `pnpm exec tsc --noEmit`. Update CLAUDE.md when convenient.
- **`tw-animate-css`** — was missing from `package.json` pre-this-session. Likely dropped during the `e6f4b4e` polish commit. Now restored.

---

## Two-chat workflow

Framework files kept for future use:
- `docs/handoff_executor.md` — executor entry-point doc.
- `docs/tests/_TEMPLATE.md` — phase report template.

Per-task plan + executor instructions are written when needed, not preemptively. Solo personal project — no corporate ceremony.

---

## Locked — don't re-litigate

- No new dependencies without explicit OK (global tooling pre-flight rule).
- Hooks + localStorage state only. No Redux/Zustand/MobX.
- Tailwind v4 CSS-only. No `tailwind.config.js`.
- Dark theme only. `bg-[#0a0a0a]` base.
- `pnpm` in `webapp/`, `npm` in `mcp-server/`. Never mix.
- `@/*` alias for webapp imports.
- `strict: true` TypeScript, no `: any` escapes.
- MCP server stays separate Node project.
- See [`CLAUDE.md`](../CLAUDE.md) for the full rule set.
