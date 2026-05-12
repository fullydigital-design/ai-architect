# Executor Instruction — Phase 1: Cleanup (route all console.* through logger)

**Phase id:** `cleanup_p1`
**Plan doc:** [`docs/plan_cleanup.md`](../plan_cleanup.md) — **READ FIRST**.
**Working dir:** `E:\_AI\AI_architect`
**Estimated wallclock:** one session, single sweep.

---

## Goal (one sentence)

Create `webapp/src/utils/logger.ts` and replace every `console.<log|debug|info|warn|error>(` call in `webapp/src/` with `logger.<method>(`, then prove `pnpm build` still passes.

---

## Unified locked assumptions

| Axis | Value | Source |
|---|---|---|
| Scope root | `webapp/src/**/*.{ts,tsx}` | plan_cleanup.md §Scope |
| Methods replaced | `log`, `debug`, `info`, `warn`, `error` | plan_cleanup.md §Replacement mapping |
| Methods skipped | `table`, `group`, `trace`, `time`, `count`, `dir`, `assert` | plan_cleanup.md §Edge cases |
| Path alias | `@/utils/logger` (resolves to `webapp/src/utils/logger.ts`) | tsconfig.json |
| Logger design | locked in plan_cleanup.md §"Locked design" — copy verbatim | plan_cleanup.md |
| No dependency changes | `webapp/package.json` byte-identical pre/post | gate 5 |
| No directory changes | only `webapp/src/utils/logger.ts` as new file | gate 4 |

---

## Headline-on-return format (paste this into chat when done)

```
HEADLINE
- Status: PASS | FAIL | PARTIAL | BLOCKED
- Phase: cleanup_p1
- Key numbers: <X> files touched; <Y> console.* → logger.*; build PASS / FAIL
- Flags: <0 or list>
- Decision needed from brainstorm: <yes/no — what>
- Report: docs/tests/cleanup_p1_<YYYYMMDD>_<HHMM>.md
- DEVLOG: prepended ✅
```

---

## Stage-by-stage execution

### Stage 0 — Pre-flight (5 min)

0.1. `git status` — confirm working tree clean. If dirty, stop and ask brainstorm.
0.2. `git rev-parse HEAD` — record as `git_commit_start` in the test report header.
0.3. Create test report file: copy `docs/tests/_TEMPLATE.md` to `docs/tests/cleanup_p1_<YYYYMMDD>_<HHMM>.md`. Fill `date_started`, `git_commit_start`, `status: IN_PROGRESS`.
0.4. Read `webapp/tsconfig.json` and confirm `paths` maps `@/*` → `./src/*`. If not, **STOP and report** — the plan assumes this alias.
0.5. Read `webapp/vite.config.ts` and confirm Vite injects `import.meta.env.DEV`. If unsure, **STOP and report**.

**Stage 0 gate:** all 5 checks PASS. If any FAIL → halt, write report, return to brainstorm.

---

### Stage 1 — Create the logger facade (5 min)

1.1. Create `webapp/src/utils/logger.ts` with the **exact** code from `docs/plan_cleanup.md` §"Locked design". Do not modify the design.
1.2. Verify the file imports cleanly: `cd webapp && pnpm exec tsc --noEmit` (or `pnpm build` if `tsc --noEmit` not wired). Expect zero new errors.

**Stage 1 gate:** logger.ts exists, typecheck passes. If FAIL → halt.

---

### Stage 2 — Sweep replacements (30–60 min)

Work file-by-file from the audit grep list (the 36-file console.* set + the 44-file `any` set overlap; use the console set as the worklist). For each file:

2.1. Read the file.
2.2. Add `import { logger } from '@/utils/logger';` to the import block. If the file has `@/...` imports already, place alphabetically with them. If not, append after the last existing import. Do NOT add a blank line where there wasn't one.
2.3. Replace each occurrence:
   - `console.log(` → `logger.log(`
   - `console.debug(` → `logger.debug(`
   - `console.info(` → `logger.info(`
   - `console.warn(` → `logger.warn(`
   - `console.error(` → `logger.error(`
2.4. Use `Edit` with `replace_all: true` per pattern per file. Confirm by counting expected vs actual replacements (the audit gave per-file counts; cross-check).
2.5. **Do NOT replace** `console.table(`, `console.group(`, `console.trace(`, `console.time(`, `console.count(`, `console.dir(`, `console.assert(`. If found, list them in the report's Issues section with file:line. Leave them as raw `console.*`.
2.6. **Do NOT touch** anything inside `/* */` or `//` comments — the word-boundary regex `\bconsole\.(log|debug|info|warn|error)\(` only matches code. If a comment happens to contain a literal `console.log(`, leave it.
2.7. Move to the next file. Track progress in TodoWrite if useful (44 files is comfortable for one session).

**Stage 2 gate:** `rg --type ts --type tsx 'console\.(log|debug|info|warn|error)\(' webapp/src/` returns **zero matches**. If any remain → halt, list the survivors in the report.

---

### Stage 3 — Verification (10 min)

3.1. `cd webapp && pnpm build` — must exit 0. Record full output to `docs/tests/cleanup_p1_<ts>_build_log.txt` if it FAILs.
3.2. `git diff --stat` — record the file/line counts in the test report's "Files changed" table.
3.3. `git status` — confirm:
   - One new file: `webapp/src/utils/logger.ts`
   - One new file (this session's report): `docs/tests/cleanup_p1_<ts>.md`
   - Edits to existing files in `webapp/src/`
   - Edits to `DEVLOG.md` (from Stage 5)
   - **No** edits to `package.json`, `pnpm-lock.yaml`, `mcp-server/`, `scripts/`, `electron/`, `vite.config.ts`, `tsconfig.json`, `CLAUDE.md`, `AGENTS.md`, `docs/SESSION_STATE.md`, `docs/plan_*.md`, `docs/instructions/*.md`, `docs/tests/_TEMPLATE.md`, `docs/handoff_executor.md`.
3.4. If any unexpected file is in `git status` → halt, document, do NOT commit.

**Stage 3 gate:** all three checks PASS.

---

### Stage 4 — `any`-hotspot audit (10 min, no fix)

4.1. Run: `rg --type ts --type tsx -c ':\s*any\b|<any>' webapp/src/ | sort -t: -k2 -nr | head -15`.
4.2. Paste the top-15 list into the test report's **Appendix A** with this table:

   | rank | file | total `: any` + `<any>` count | top use (1-line guess) |
   |---|---|---|---|

4.3. Open each of the top-3 files briefly and add a one-line "top use" guess (e.g. "untyped ComfyUI API response", "event handler arg"). Do NOT fix anything.

**Stage 4 gate:** appendix populated with 15 rows.

---

### Stage 5 — Report + DEVLOG (10 min)

5.1. Fill out the test report completely per `docs/tests/_TEMPLATE.md`:
   - Headline block.
   - "What was done" — 2 sentences.
   - "Scope verification" — all four boxes checked.
   - "Files changed" table — populated from `git diff --stat`.
   - "Verification" table — build PASS, typecheck PASS.
   - "Gates evaluated" — all 7 gates from plan_cleanup.md §Gates, each PASS.
   - "Issues encountered" — list any `console.table/group/trace/time` left raw, or anything else weird.
   - "Decisions / next steps" — propose Phase 2 (tooling) or Phase 3 (any-tightening) per appendix evidence.
   - Appendix A — `any`-hotspot top-15.
   - Set `date_completed`, `git_commit_end` (or "none — no commit made" if you didn't commit), `status: PASS`.

5.2. Prepend a DEVLOG entry at the top of `E:\_AI\AI_architect\DEVLOG.md`:

   ```
   ## YYYY-MM-DD — Phase 1 cleanup: console.* → logger
   Phase(s): cleanup_p1
   Reports: docs/tests/cleanup_p1_<YYYYMMDD>_<HHMM>.md
   Outcome: PASS
   Notes: <N> files touched, <X> console.* calls routed through new webapp/src/utils/logger.ts. Build PASS. `any`-hotspots logged in Appendix A — scope-feeds Phase 3.
   ```

5.3. Do NOT commit. Brainstorm reviews first, then user authorizes the commit.

**Stage 5 gate:** report complete, DEVLOG prepended, no commit made.

---

## Constraints / non-negotiables

- **No new dependencies.** `webapp/package.json` and `pnpm-lock.yaml` must be byte-identical.
- **No new top-level directories.** Only `webapp/src/utils/logger.ts` is allowed as a new file (plus the test report).
- **No file edits outside `webapp/src/`** except `DEVLOG.md` and the new test report.
- **No refactoring** of code surrounding the `console.*` calls. Even if a function next to the call is begging for cleanup, leave it.
- **No type fixes**, no new `any` removed, no `: unknown` introduced. Pure plumbing.
- **No new comments** added to code you didn't change.
- **No `console.*` left in `webapp/src/`** other than the documented exceptions (`table/group/trace/time/count/dir/assert`).

---

## On blocker — halt-and-surface

Stop immediately and write a `status: BLOCKED` report on:

- `@/*` alias not resolving (Stage 0.4).
- `import.meta.env.DEV` semantics unclear (Stage 0.5).
- `pnpm build` failing after replacements (Stage 3.1).
- Any file in `webapp/src/` already importing a different `logger` (Stage 2 collision).
- More than 20% of files showing a count mismatch between the audit grep and the actual edit count (Stage 2.4 — indicates a regex or scope bug).
- Any reason the executor wants to deviate from the locked design or scope.

Report the blocker in the test report's "Issues encountered" section, set `status: BLOCKED`, prepend a DEVLOG entry with `Outcome: BLOCKED`, return to brainstorm. Do NOT improvise a fix.

---

## What success looks like

End-of-session state:

- `webapp/src/utils/logger.ts` exists, ~30–50 LOC, matches locked design.
- `rg --type ts --type tsx 'console\.(log|debug|info|warn|error)\(' webapp/src/` returns 0 lines.
- `cd webapp && pnpm build` exits 0.
- `git status` shows: 1 new logger file + ~44 edited source files + 1 new test report + 1 edited DEVLOG.md. Nothing else.
- Test report PASS, all 7 gates PASS.
- DEVLOG entry prepended.
- Headline-on-return block posted in the executor chat.

Brainstorm reviews. User authorizes a commit. Phase 1 closes.
