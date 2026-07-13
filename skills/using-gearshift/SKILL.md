---
name: using-gearshift
description: Use when Gearshift is installed and any coding request, code change, refactor, migration, or implementation work begins.
---

# Using Gearshift

Gearshift is the top-level workflow controller. Route every coding request before third-party workflow frameworks.

## Routing Contract

1. If the user explicitly invokes Quick or Complex, that explicit gear wins. Load the matching Gearshift Skill immediately; do not classify again.
2. Otherwise, **REQUIRED SUB-SKILL:** Use `gearshift:complexity-router` before loading brainstorming, TDD, planning, debugging, or third-party workflow Skills.
3. State the selected gear in the Router's required format and follow only that gear's workflow.
4. If evidence later crosses an upgrade threshold, announce the upgrade and continue with the stronger gear. Never silently downgrade.

Gearshift controls workflow selection only. Continue to use domain and tool Skills inside the selected workflow when relevant.
