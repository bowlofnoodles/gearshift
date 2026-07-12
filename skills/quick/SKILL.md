---
name: quick
description: Use when the user explicitly selects Quick or a coding task is clear, localized, low-branching, and needs no meaningful design decision.
---

# Quick Gear

Move directly from evidence to implementation.

1. Inspect the relevant code and repository guidance.
2. Implement the localized change in the current workspace.
3. Run proportionate verification: choose the smallest relevant existing test, type check, build, formatter, parser, or visual check.
4. Report the change and verification evidence.

Create no task directory or workflow artifacts. Skip grilling, brainstorming, design documents, plans, worktrees, mandatory TDD, and workflow review stages.

If hidden complexity crosses into Standard or Full, follow `gearshift:complexity-router` upgrade rules. For explicitly selected Quick, stop and ask before upgrading; do not continue a complex change under the Quick contract.
