---
name: init
description: Use when a repository needs first-time Gearshift setup, managed routing guidance, or initialization repair.
---

# Initialize Gearshift

Initialize the current repository idempotently with the bundled CLI:

```bash
node "${PLUGIN_ROOT}/scripts/gear.mjs" init --root "$PWD"
```

Show every created, preserved, warning, and error entry. Never overwrite user-owned content outside Gearshift's managed marker blocks.

If Complex dependencies are missing, explain which gear needs each dependency and ask before installing anything. Do not install or upgrade third-party Skills without explicit approval.

Then run:

```bash
node "${PLUGIN_ROOT}/scripts/gear.mjs" doctor --root "$PWD"
```

Report Doctor failures with actionable paths. Do not claim initialization succeeded while an initialization error remains.
