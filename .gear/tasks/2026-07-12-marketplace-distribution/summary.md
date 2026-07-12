# Marketplace Distribution: Summary

## Delivered

- Added `.agents/plugins/marketplace.json` so the Gearshift repository is a self-contained Codex marketplace.
- Confirmed the marketplace can point directly at the repository-root plugin; no repository restructuring or separate marketplace repository is needed.
- Added manifest and bilingual documentation contract tests.
- Replaced placeholder Codex installation guidance with verified marketplace add, plugin install, and marketplace upgrade commands.
- Preserved the Claude Code source-checkout flow.

## Verification

- Local-checkout marketplace installation succeeded in an isolated `CODEX_HOME`.
- GitHub marketplace installation from `bowlofnoodles/gearshift` on `feat/marketplace-distribution` succeeded in an isolated `CODEX_HOME`.
- `gearshift@gearshift` reported `installed, enabled`, version `0.1.0`.
- Installed cache contained Gearshift Skills, hooks, scripts, manifests, templates, and assets.
- `npm test`: 62/62 passing.
- `npm run validate`: 12/12 passing.
- `git diff --check`: clean.

## Test decision

Added deterministic repository tests for marketplace metadata and documented installation commands. Did not add a CI test that shells out to Codex because GitHub-hosted runners do not guarantee the Codex CLI; the equivalent install flow was exercised manually in isolated local and Git-backed Codex homes.

## Deviations

The separate marketplace repository fallback was unnecessary because current Codex CLI behavior accepts the repository root (`path: "."`) as the plugin source.

## Follow-ups

- After merge, repeat the Git installation smoke test against `main`.
- Tag `v0.1.0` after the merged `main` smoke test passes.
