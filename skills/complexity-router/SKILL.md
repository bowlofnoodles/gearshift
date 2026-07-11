---
name: complexity-router
description: Use when a natural-language coding request needs classification as Quick, Standard, or Full before implementation workflow Skills are selected.
---

# Complexity Router

Select the lightest gear that safely fits the work. Complexity, not abstract risk or file count alone, determines the workflow.

## Precedence

Apply this order: explicit user gear > project-specific classification rules > Router classification. An explicit Quick, Standard, or Full selection wins.

## Classification

Evaluate requirement clarity, scope locality, module and dependency edges, unresolved decisions, public API or data-model changes, domain rules, migration and compatibility needs, staged delivery, and likelihood of exceeding one agent context.

| Gear | Observable shape |
| --- | --- |
| Quick | Clear outcome, localized change, few dependency edges, no meaningful design decision |
| Standard | Bounded feature or fix with decisions that focused questioning and a short plan can resolve |
| Full | Migration, module rewrite, architectural or cross-system change, compatibility work, many coupled decisions, or staged delivery |

File count is evidence, never a hard threshold.

## Output and Action

Output exactly:

`Gear: <Quick|Standard|Full> — <one sentence>`

For automatic classification, continue without asking for confirmation. Load the selected Gearshift workflow Skill.

## Gear Changes

- If a natural-language task reveals hidden complexity, announce the reason and upgrade automatically.
- If an explicitly selected Quick task crosses into Standard or Full, pause and ask permission to upgrade.
- If Standard expands substantially, preserve its artifacts and upgrade to Full.
- Never silently downgrade an explicitly selected Full task.
- Never change gear without stating why.
