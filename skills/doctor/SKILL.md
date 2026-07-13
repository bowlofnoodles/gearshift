---
name: doctor
description: Use when diagnosing Gearshift setup, dependency compatibility, routing guidance.
---

# Gearshift Doctor

Run the bundled read-only diagnostic:

```bash
node "${PLUGIN_ROOT}/scripts/gear.mjs" doctor --root "$PWD"
```

Doctor checks plugin and dependency versions, managed `AGENTS.md` or `CLAUDE.md` guidance, and routing fixtures.

Report every pass, warning, and error. For failures, explain the affected gear and give the exact path or dependency evidence when available.

Doctor does not repair, install, upgrade, delete, relocate, or rewrite anything. If the user asks for a repair after reviewing the report, perform it as a separate explicitly authorized task and verify by running Doctor again.
