# Session State (brainstorm-chat working file)

**Read first after compact / new session.** Single source of "where we are right now". Updated by brainstorm at end of each session.

---

## WHERE WE ARE (2026-05-12)

Just completed full project audit (memory + velvet cross-pollination). Found no blockers — codebase is structurally clean post-April polish, but has hygiene debt: 282 `console.*` calls, 287 `: any` occurrences, zero tests, zero lint, no CI.

Two-chat workflow (brainstorm ↔ executor) scaffolded. Same pattern as velvet-research / velvet-monitor.

---

## Queue (priority-locked, one-at-a-time execution)

1. **Phase 1 — Cleanup (NO NEW FEATURES)** — QUEUED for executor 2026-05-12.
   - Scope: route all `console.*` through a thin `logger` module; verify `pnpm build` passes; document `any`-hotspots without fixing them.
   - Plan: [`docs/plan_cleanup.md`](plan_cleanup.md)
   - Instructions: [`docs/instructions/cleanup_p1_executor.md`](instructions/cleanup_p1_executor.md)
   - Stop-and-report on: build failure, ambiguous console call (UX-visible vs. debug), any temptation to refactor surrounding code.

2. **Phase 2 — Tooling pre-flight (HOLD, pending user approval per global CLAUDE.md tooling rule)** — proposed: ESLint flat config, Prettier, Vitest. Install one tool at a time after user OK.

3. **Phase 3 — `any`-tightening (HOLD, scope TBD after Phase 1 audit output)** — depends on Phase 1's `any`-hotspot report.

4. **Phase 4 — App.tsx decomposition (HOLD)** — 3 355-line monolith. Split into 3–4 Provider containers. Big refactor, requires fresh DR-001 before queuing.

5. **Phase 5 — CI (HOLD)** — GitHub Actions: typecheck + lint + (later) test. Gated on Phase 2 completion.

---

## Active deliverables

None — scaffolding only this session.

---

## Rationale for the cleanup-first sequence

- Cleanup has zero new dependencies → no tooling approval needed, executor can run unattended.
- It produces a useful side-effect: a `logger` module that future tooling (Sentry, structured logs, Electron file-logger) can plug into without a sweep across 280+ call sites.
- It surfaces the real `any`-hotspot list so Phase 3 has scope grounded in evidence, not the audit's blunt grep count.
- It validates the two-chat protocol on a small, low-risk task before we run it against bigger refactors.

---

## LOCKED — don't re-litigate

- **No new features** during cleanup phase. Bug fixes only if surfaced incidentally.
- **No new dependencies** without explicit user approval (global tooling pre-flight rule).
- **`@/*` path alias** for all webapp imports.
- **Hooks + localStorage** state model — no Redux/Zustand/MobX.
- **Tailwind v4 CSS-only** — never create `tailwind.config.js`.
- **Dark theme only** — `bg-[#0a0a0a]` base.
- **MCP server stays separate** Node project from webapp.
- See [`CLAUDE.md`](../CLAUDE.md) for the full rule set.

---

## Workflow non-negotiables (ported from velvet-research)

- Plan doc BEFORE executor instruction.
- One phase at a time. Do NOT start phase N+1 until phase N has a completed test report in `docs/tests/`.
- Headline-first test reports (5 lines max): status, key numbers, flags, decision needed, detail links.
- Executor halts and reports on any gate failure — never silently continues.
- DEVLOG entry per executor session, referencing every test report produced.
- SESSION_STATE.md updated by brainstorm before `/compact` or end-of-session.

---

## Files to read FIRST after compact / new chat

1. This file (`docs/SESSION_STATE.md`)
2. `CLAUDE.md` — full project rules (root)
3. `AGENTS.md` — agent conventions (root)
4. `docs/handoff_executor.md` — handoff protocol when opening an executor chat
5. `~/.claude/projects/e---AI-AI-architect/memory/MEMORY.md` — auto-memory index

---

## Update protocol

Update this file:
- At end of every brainstorm session.
- After every executor return (queue item closure or status change).
- Before `/compact`.

Keep concise — if any section >15 lines, move detail into a plan doc or decision log.
