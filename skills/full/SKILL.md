---
name: full
description: Use when the user explicitly selects Full or work involves migrations, module rewrites, architecture, cross-system changes, compatibility, or staged delivery.
---

# Full Gear

Use the complete compatible Superpowers methodology while Gearshift retains ownership of task state and document locations.

1. Create a Full task with the bundled CLI.
2. **REQUIRED SUB-SKILL:** Use `gearshift:artifact-contract`. Give every downstream Skill absolute destinations for `.gear/tasks/<task-id>/design.md` and `.gear/tasks/<task-id>/plan.md`; never accept an upstream default document path.
3. Run `superpowers:brainstorming` through design approval and save the design at the canonical path.
4. Run `superpowers:writing-plans` and save the detailed plan at the canonical path.
5. Run `superpowers:using-git-worktrees` unless the user explicitly declines isolation.
6. Run `superpowers:test-driven-development`, then execute the plan with `superpowers:subagent-driven-development` or `superpowers:executing-plans` as appropriate.
7. Use `superpowers:requesting-code-review`, `superpowers:verification-before-completion`, and `superpowers:finishing-a-development-branch` at their normal gates.
8. Validate canonical artifacts after every delegation. Write `summary.md` and complete task state only after final verification.

Do not edit, copy, or vendor Superpowers Skills. An explicitly selected Full task never silently downgrades.
