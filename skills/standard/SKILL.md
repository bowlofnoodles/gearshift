---
name: standard
description: Use when the user explicitly selects Standard or bounded coding work has unresolved decisions that need focused questioning and a short plan.
---

# Standard Gear

Align enough to implement bounded work without imposing the Full methodology.

1. Create a Standard task with the bundled CLI and use its returned task ID.
2. **REQUIRED SUB-SKILL:** Use `grill-me` for bounded product or implementation decisions. Use `grill-with-docs` when domain language, boundaries, existing documents, or durable decisions matter.
3. **REQUIRED SUB-SKILL:** Use `gearshift:artifact-contract`. Write resolved scope to `.gear/tasks/<task-id>/brief.md` and a concise implementation plan to `.gear/tasks/<task-id>/plan.md`. Add `design.md`, glossary changes, research, or an ADR only when their stated thresholds apply.
4. Implement in the current workspace. TDD is not mandatory. Do not require brainstorming, a worktree, or Full's dual-review stages.
5. Run relevant existing tests, lint, type checks, and builds.
6. After implementation, ask whether the user wants new tests added. Record that decision.
7. Write `.gear/tasks/<task-id>/summary.md` with delivered work, deviations, verification evidence, test decision, and follow-ups. Mark the task completed only after verification.

If scope expands substantially, preserve all Standard artifacts, explain the change, and upgrade to Full.
