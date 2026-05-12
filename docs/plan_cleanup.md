# Phase 1 — Cleanup (no new features)

**Created:** 2026-05-12 by brainstorm chat.
**Trigger:** Project audit identified 282 unrouted `console.*` calls and 287 `: any` occurrences in `webapp/src/`. No tests, no lint, no CI. Velvet-monitor pattern showed centralized logger is prerequisite for any future structured logging / Sentry / Electron file-logger.
**Nature:** Hygiene-only. No new features, no refactors of unrelated code, no new dependencies.

---

## Honest framing (read first)

Phase 1 is a **plumbing pass**, not a quality crusade. It answers one question:

> Before we add any tooling, tests, or refactors, can we route all `console.*` calls through a single module so that future work (lint rule banning raw `console`, file logger, telemetry) has a clean attach point?

What Phase 1 does NOT do:

- Does NOT install ESLint, Prettier, Vitest, or any other tool — those need explicit user approval per global tooling pre-flight rule.
- Does NOT touch the `any`-type problem beyond *reporting* hotspots. Fixing types is Phase 3, after this audit produces evidence.
- Does NOT split `App.tsx`. That's Phase 4 (App decomp) and needs its own DR-001.
- Does NOT add a logging backend (file output, remote, Electron IPC). The `logger` module ships as a thin facade only — backends are future work.
- Does NOT change any user-visible behavior. The webapp must look and behave identically before and after.

What Phase 1 IS:

- A one-shot find-and-replace from `console.<method>(...)` to `logger.<method>(...)` across `webapp/src/`.
- Creation of `webapp/src/utils/logger.ts` — a 30–50 line facade.
- A typecheck + build pass to prove nothing broke.
- A short `any`-hotspot list filed as an appendix in the test report, scoping Phase 3.

---

## Scope — exact file boundaries

### In scope
- `webapp/src/**/*.ts` and `webapp/src/**/*.tsx` — all source files.
- New file: `webapp/src/utils/logger.ts`.

### Out of scope
- `mcp-server/**` — has its own console patterns, separate Phase 1b if needed (defer).
- `electron/main.cjs` and `electron/preload.cjs` — CommonJS, runs in Node main process, not in scope.
- `scripts/**` — PowerShell + Node bootstrap, not in scope.
- Any `.config.{ts,js,cjs,mjs}` files (vite, electron-builder, etc.) — not in scope.
- Tests (none exist yet).

---

## Locked design: `webapp/src/utils/logger.ts`

```ts
// Thin facade over console. Drops debug/info in production builds; warn/error always pass through.
// Future: pluggable backend (Electron IPC, file, Sentry) — for now, console only.

const isDev = import.meta.env.DEV;

type LogArgs = Parameters<typeof console.log>;

export const logger = {
  debug: (...args: LogArgs) => { if (isDev) console.debug(...args); },
  info:  (...args: LogArgs) => { if (isDev) console.info(...args); },
  log:   (...args: LogArgs) => { if (isDev) console.log(...args); },
  warn:  (...args: LogArgs) => { console.warn(...args); },
  error: (...args: LogArgs) => { console.error(...args); },
};
```

Notes:
- `import.meta.env.DEV` is the Vite-injected boolean. True under `pnpm dev`, false under `pnpm build` output.
- `warn` / `error` always pass through — they're operational signal, not debug noise.
- `debug` / `info` / `log` drop in production — they're hot paths in services like `comfyui-execution` and `experiment-engine`.

---

## Replacement mapping (mechanical)

| Source pattern | Replacement |
|---|---|
| `console.log(` | `logger.log(` |
| `console.debug(` | `logger.debug(` |
| `console.info(` | `logger.info(` |
| `console.warn(` | `logger.warn(` |
| `console.error(` | `logger.error(` |

Every modified file gets `import { logger } from '@/utils/logger';` added at the top of its existing import block (alphabetically sorted with neighbours if the file already follows that convention; otherwise just appended below the last `@/...` import).

---

## Edge cases — handle explicitly

1. **`console.log` inside a `try { } catch (err) { console.error(...) }`** — still maps to `logger.error`. No behavior change.
2. **Multi-line `console.log(` with continuation arguments** — replace only the prefix `console.log(` → `logger.log(`. The args structure is unchanged.
3. **Template-literal console calls** — same. Mapping is purely the method name.
4. **`console.log` used inside an inline arrow callback** (e.g. `.catch(e => console.error(e))`) — same mapping.
5. **`console.table`, `console.group`, `console.trace`, `console.time`** — RARE. If found, leave untouched and flag in the report (`logger` doesn't expose them yet, and they're dev-only utilities). Do NOT add them to the facade in this phase.
6. **Files that already import a `logger`** (none expected, but check) — flag and stop. Phase needs re-scoping.
7. **`console.log` inside a comment or JSDoc** — leave alone. Use word-boundary regex.

---

## `any`-hotspot reporting (no fix, just audit)

After the console sweep is clean, run `rg -n --type ts --type tsx ':\s*any\b|<any>' webapp/src/` and produce a top-15 file list (by occurrence count) in the test report appendix. This grounds Phase 3 in evidence, not the audit's blunt 287 count.

Format:
```
| file | : any count | <any> count | notes |
```

Do NOT fix any of them in this phase.

---

## Outputs

1. New file: `webapp/src/utils/logger.ts` (~30–50 LOC).
2. Edits across ~44 files in `webapp/src/` (per audit grep).
3. Test report: `docs/tests/cleanup_p1_<YYYYMMDD>_<HHMM>.md` per `docs/tests/_TEMPLATE.md`, with:
   - Headline block.
   - Files-changed table.
   - Verification table (typecheck + build PASS).
   - Gate evaluation table (all gates below).
   - Appendix A: `any`-hotspot top-15.
   - Issues encountered.
4. DEVLOG entry prepended.

No memory updates, no SESSION_STATE update — brainstorm handles those.

---

## Gates (executor must record PASS/FAIL for each)

| # | Gate | Pass condition |
|---|---|---|
| 1 | `webapp/src/utils/logger.ts` created with the locked design | File present + matches spec |
| 2 | Zero raw `console.<method>(` calls remaining in `webapp/src/` (except `console.table/group/trace/time` if any) | `rg 'console\.(log\|debug\|info\|warn\|error)\(' webapp/src/` returns 0 lines |
| 3 | `cd webapp && pnpm build` exits 0, no new TS errors | Build green |
| 4 | No new top-level directories | `git status` shows only `webapp/src/utils/logger.ts` as new + edits to existing files |
| 5 | No new dependencies | `webapp/package.json` byte-identical to pre-phase |
| 6 | No files outside `webapp/src/` modified | `git status` confirms |
| 7 | `any`-hotspot appendix populated | Top-15 list present in report |

Any gate FAIL = halt, write report with `status: FAIL`, return to brainstorm.

---

## Reversibility

Phase 1 is **fully reversible** via `git revert` of the cleanup commit. The `logger` facade is opt-in (any code can still call raw `console` if reverted), and the replacements are syntactic.

---

## Out of scope (defer to future phases)

- `mcp-server/` console cleanup → Phase 1b if needed (low priority, server logs are useful as-is).
- ESLint rule banning raw `console` → Phase 2 (tooling pre-flight).
- Sentry / file logger / IPC backend for the `logger` module → future phase, requires DR-001.
- `any` tightening → Phase 3, scoped from this phase's appendix.
- `App.tsx` decomposition → Phase 4, needs its own plan doc.

---

## Files to read before executor opens this phase

1. This plan doc.
2. `docs/instructions/cleanup_p1_executor.md` — step-by-step.
3. `CLAUDE.md` + `AGENTS.md` — project rules.
4. `webapp/vite.config.ts` — confirm `import.meta.env.DEV` semantics.
5. `webapp/tsconfig.json` — confirm `@/*` alias resolves to `webapp/src/*`.
