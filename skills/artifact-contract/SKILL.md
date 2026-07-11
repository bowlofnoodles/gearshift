---
name: artifact-contract
description: Use when Standard or Full work creates, reads, delegates, validates, or resumes design and planning documents in a Gearshift repository.
---

# Artifact Contract

Keep all workflow documents under `.gear/`. Supply absolute canonical target paths to every delegated Skill; do not modify or copy third-party Skills.

## Shared Paths

| Path | Content |
| --- | --- |
| `.gear/config.yaml` | Project Gearshift configuration |
| `.gear/index.md` | Task index and links |
| `.gear/context/architecture.md` | Current architecture, not proposals |
| `.gear/context/glossary.md` | Domain terms, not implementation notes |
| `.gear/adr/` | Durable architectural decisions only |
| `.gear/tasks/<task-id>/task.json` | Machine-readable task state |
| `.gear/tasks/<task-id>/brief.md` | Scope, goals, constraints, resolved questions |
| `.gear/tasks/<task-id>/design.md` | Approved design when required |
| `.gear/tasks/<task-id>/plan.md` | Implementation plan |
| `.gear/tasks/<task-id>/research/` | Task-specific source material |
| `.gear/tasks/<task-id>/summary.md` | Delivered work, deviations, verification, test decision, follow-ups |

Quick creates no task artifacts. Standard requires `task.json`, `brief.md`, `plan.md`, and `summary.md`; `design.md` is conditional. Full requires all five core documents.

## Delegation Check

Before delegation, provide absolute `.gear/` destinations. Validate after delegation that required files exist, relative links resolve, and no `CONTEXT.md` or `docs/superpowers/specs/` tree was created outside `.gear/`. Report unexpected files and preserve them; never silently delete or relocate user content.
