---
name: <phase_id>_<YYYYMMDD>_<HHMM>
phase: <e.g. cleanup_p1 | tooling_p2 | any_tighten_p3 | app_decomp_p4>
date_started: YYYY-MM-DD HH:MM
date_completed: YYYY-MM-DD HH:MM
status: PASS | FAIL | PARTIAL | BLOCKED | IN_PROGRESS
git_commit_start: <hash at start>
git_commit_end: <hash at end or "none — no commit made">
---

# <Phase title> — <Date>

## Headline (REQUIRED — first 5 lines, brainstorm reads this first)

- **Status:** PASS | FAIL | PARTIAL | BLOCKED
- **Key numbers:** <2–4 most important: e.g. "282 console.* → 0; build PASS; typecheck PASS; 12 files touched">
- **Flags:** <0 / list any items needing brainstorm attention; "none" if clean>
- **Decision needed from brainstorm:** <yes/no — what>
- **Detail links:** <jump-to-section anchors for any flag>

---

## What was done

<1–3 sentences. Match exactly what the executor instruction prescribed.>

## Scope verification

- [ ] No files touched outside the phase's declared scope.
- [ ] No new dependencies added.
- [ ] No new top-level directories created.
- [ ] No features added; only the changes the instruction prescribed.

## Files changed

| File | Change type | Lines added | Lines removed | Notes |
|---|---|---|---|---|
| `webapp/src/...` | new / edit / delete | | | |

Total: `<N>` files, `+<X>` / `−<Y>` lines.

## Verification

| Check | Command | Result | Notes |
|---|---|---|---|
| TypeScript build | `cd webapp && pnpm build` | PASS / FAIL | |
| MCP server build (if touched) | `cd mcp-server && npm run build` | PASS / FAIL / N/A | |
| Electron dev launch (if relevant) | `cd webapp && pnpm electron:dev` | PASS / FAIL / N/A | manual smoke |
| Vite dev launch (if relevant) | `cd webapp && pnpm dev` | PASS / FAIL / N/A | manual smoke |
| <Phase-specific check> | <cmd> | PASS / FAIL | |

## Gates evaluated

(From `docs/instructions/<phase>_executor.md` §Gates — copy each gate here with PASS/FAIL.)

| # | Gate | Source | Result |
|---|---|---|---|
| 1 | <gate description> | instruction §Gates | PASS / FAIL |
| 2 | ... | ... | ... |

## Issues encountered

<One bullet per issue, even minor. Include workaround or "deferred to brainstorm".>

- ...

## Decisions / next steps

- [ ] Proceed to next phase: `<phase_id>`
- [ ] Escalate to brainstorm for: <reason>
- [ ] Update memory: <which file, what fact>
- [ ] None — phase is complete and clean.

## Links

- DEVLOG entry: [`DEVLOG.md`](../../DEVLOG.md) (YYYY-MM-DD)
- Plan: [`docs/plan_<phase>.md`](../plan_<phase>.md)
- Instruction: [`docs/instructions/<phase>_executor.md`](../instructions/<phase>_executor.md)
- Related test reports: <list if any>
