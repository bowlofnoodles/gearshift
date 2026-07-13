---
name: complexity-router
description: Use when a natural-language coding request needs classification as Quick or Complex before implementation workflow Skills are selected.
---

# Complexity Router

Classify the request before selecting an implementation workflow.

Apply this order: explicit user mode > project-specific classification rules > Router classification. An explicit Quick or Complex selection wins.

## Modes

| Mode | Use when |
| --- | --- |
| Quick | Clear, localized change with no unresolved requirements and no public contract change |
| Complex | Anything else: bounded features, unresolved decisions, docs-backed work, migrations, public API changes, rewrites, or cross-system work |

## Required Output

Start with exactly:

`Gear: <Quick|Complex> — <one sentence>`

Then continue without asking for confirmation unless Quick was explicit and the work is too complex.

## Upgrade Rules

- Natural-language requests route directly to the selected mode without asking.
- If an implicitly selected Quick task reveals unresolved requirements or broader scope, announce the boundary and upgrade to Complex.
- If an explicitly selected Quick task crosses into Complex, pause and ask permission to upgrade.
- Never use the removed Standard or Full gears.
