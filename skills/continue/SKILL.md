---
name: continue
description: Use when resuming interrupted Standard or Full work, recovering task state in a new session, or resolving a stale Gearshift task pointer.
---

# Continue a Task

Read repository evidence instead of relying on conversation memory.

```bash
node "${PLUGIN_ROOT}/scripts/gear.mjs" continue --root "$PWD" --json
```

- If exactly one consistent task is resumable, state its gear, last completed phase, and next action, then resume it.
- If multiple tasks need attention, present their IDs, titles, gears, statuses, and evidence; ask the user to select one.
- If the pointer is stale or artifacts disagree with state, inspect task files, Git status, and actual changes. Propose a specific state repair before writing it.
- If nothing is resumable, report that result and stop.

Never repeat completed grilling, approved design, planning, or verification phases. Never recreate a task directory, discard edits, or infer completion from memory alone. Load the matching Standard or Full Skill at the first incomplete phase.
