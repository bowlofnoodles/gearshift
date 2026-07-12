# Claude Marketplace Distribution: Summary

## Delivered

- Added `.claude-plugin/marketplace.json` with Gearshift at the repository root.
- Bumped Codex, Claude, package, compatibility, and marketplace metadata to `0.1.1`.
- Added direct Claude Code marketplace installation and update instructions to both READMEs.
- Kept `claude --plugin-dir` documented as the development workflow.
- Removed the redundant Claude manifest `hooks` field because current Claude Code auto-discovers `hooks/hooks.json`.
- Made the Doctor CLI version assertion derive from `package.json` instead of hard-coding a release.

## Verification

- `claude plugin validate .`: passed with Claude Code 2.1.187.
- Local-checkout marketplace install in an isolated `HOME`: version `0.1.1`, status enabled.
- GitHub feature-branch marketplace install in an isolated `HOME`: version `0.1.1`, status enabled.
- Installed plugin included Gearshift commands, Skills, hooks, scripts, templates, and manifests.
- `npm test`: 65/65 passing.
- `npm run validate`: 14/14 passing.
- `git diff --check`: clean.

## Test decision

Added deterministic tests for the Claude marketplace, unified release versions, documented commands, automatic hook discovery, and dynamic Doctor version output. Did not add CI shell tests against Claude Code because GitHub-hosted runners do not guarantee the Claude CLI; equivalent local and Git-backed installs were verified in isolated environments.

## Deviations

The first real installation exposed a duplicate hook load that static validation did not report. Removing the explicit standard hook path fixed the load failure while preserving automatic hook discovery.

## Follow-ups

- After merge, smoke-test both Claude Code and Codex installations from `main`.
- Tag `v0.1.1` only after both platform smoke tests and post-merge CI pass.
