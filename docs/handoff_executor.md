# Handoff to Executor Chat

**From:** brainstorm chat.
**To:** new executor chat, opened in `E:\_AI\AI_architect` cwd.
**Trigger phrase to open executor chat:** start the new chat with the literal sentence "executor chat — load instructions" so it knows to read this file first.

---

## 0. Before you start — READ these, in this order

1. `E:\_AI\AI_architect\CLAUDE.md` — full project rules and architecture.
2. `E:\_AI\AI_architect\AGENTS.md` — agent conventions, file modification protocol, what-not-to-generate list.
3. `C:\Users\M\.claude\projects\e---AI-AI-architect\memory\MEMORY.md` and every file linked there — auto-memory facts about the project (ComfyUI patches, FLUX 2 architecture, active code structure).
4. `E:\_AI\AI_architect\docs\SESSION_STATE.md` — current queue, what's active, what's on hold.
5. `E:\_AI\AI_architect\DEVLOG.md` — recent session history.
6. The plan doc for the queued phase: `docs/plan_<phase>.md`.
7. The executor instruction for the queued phase: `docs/instructions/<phase>_executor.md`.
8. `docs/tests/_TEMPLATE.md` — test report template.

---

## 1. Phase sequence

Run ONE phase per session. Do NOT start phase N+1 until phase N has a completed test report in `docs/tests/`. Do NOT skip steps inside a phase.

Current queue lives in `docs/SESSION_STATE.md` §Queue. Pick the top item flagged QUEUED.

---

## 2. Stop-and-report triggers (global)

Halt execution and post a summary back to brainstorm on:

- Any phase validation-gate failure (build / typecheck / parity).
- Any temptation to add a feature, refactor surrounding code, or introduce a new dependency.
- Any ambiguous scope decision the plan doc doesn't already resolve.
- Any file in the "what not to generate" list of `AGENTS.md` would need to be created.
- Any change to a file outside the phase's declared scope.

Never silently continue past an unclear instruction. Never massage scope to make a step pass.

---

## 3. Documentation discipline (non-negotiable)

### Per phase
- Copy `docs/tests/_TEMPLATE.md` to `docs/tests/<phase_id>_<YYYYMMDD>_<HHMM>.md`.
- Fill the YAML frontmatter (date_started, git_commit_start, status: IN_PROGRESS).
- Execute the phase per `docs/instructions/<phase>_executor.md`.
- Fill the body (headline, what was done, files changed, verification, issues, decisions).
- Set final `status: PASS | FAIL | PARTIAL | BLOCKED` and `git_commit_end`.

### Per session
- Prepend a DEVLOG entry in `E:\_AI\AI_architect\DEVLOG.md` referencing every test report produced.
- Do NOT update `CLAUDE.md`, `AGENTS.md`, or memory files unless explicitly instructed by the plan doc — those are brainstorm-managed.
- Do NOT update `SESSION_STATE.md` — that's brainstorm-managed too. Just write the test report + DEVLOG entry and return to brainstorm.

---

## 4. Non-negotiable constraints (from CLAUDE.md + AGENTS.md, restated for ergonomics)

- **Read files before editing.** No blind edits.
- **`pnpm` only** in `webapp/`. Never `npm install` there.
- **`npm` only** in `mcp-server/`. Never `pnpm` there.
- **`@/*` path alias** for all webapp imports.
- **`strict: true`** TypeScript — no `any` escape hatches.
- **No `tailwind.config.js`.** Tailwind v4 is CSS-only.
- **No `@xyflow/react`.** Use `"reactflow"` (v11 API).
- **Dark theme only.** `bg-[#0a0a0a]` base.
- **No new top-level directories** without explicit approval.
- **No new dependencies** without explicit approval.
- **No `console.log`** introduced — use the `logger` module after Phase 1 lands.
- **Halt-and-report on compile/runtime errors.** No creative fallback fixes.
- **Edit / str_replace only** — never rewrite whole files unless the file is being created fresh.

---

## 5. Return-to-brainstorm format

When the phase completes (PASS or BLOCKED), reply in the executor chat with this headline block:

```
HEADLINE
- Status: PASS | FAIL | PARTIAL | BLOCKED
- Phase: <phase_id>
- Key numbers: <2–4 most important: e.g. "282 console.* → 0; build PASS; typecheck PASS; 12 files touched">
- Flags: <0 or list>
- Decision needed from brainstorm: <yes/no — what>
- Report: docs/tests/<filename>
- DEVLOG: prepended ✅
```

Brainstorm reads the headline first, drills into the report only if flags non-zero.

---

## 6. Success definition

End state per phase = a green test report referenced in DEVLOG, with all gates listed in `docs/instructions/<phase>_executor.md` §Gates marked PASS. Anything less = halt, escalate.

Nothing half-built. Nothing undocumented.
