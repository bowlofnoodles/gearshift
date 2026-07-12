# Marketplace Distribution: Brief

## Goal

Make Gearshift installable from its GitHub repository as a Codex marketplace preview, then document a clean per-project initialization flow.

## Scope

- Add repository-owned Codex marketplace metadata.
- Prefer the existing repository root as the Gearshift plugin source.
- Prove installation in an isolated Codex home from both a local checkout and the Git repository.
- Update English and Chinese installation instructions with commands that were actually verified.
- Keep Claude Code source-checkout installation working.

## Decisions and constraints

- Publish as `0.1.0` Preview/Beta, not as an official OpenAI-curated listing.
- Try a single self-contained repository before creating a separate marketplace repository.
- If Codex rejects a root plugin source, use a separate marketplace repository rather than moving the Gearshift source tree.
- Do not vendor or modify Superpowers, `grill-me`, or `grill-with-docs`.
- Installation tests must not overwrite the user's normal Codex configuration.

## Acceptance criteria

- Codex discovers `gearshift` from the repository marketplace metadata.
- `codex plugin add gearshift@gearshift` succeeds in an isolated environment.
- The installed plugin exposes Gearshift metadata and Skills.
- Both READMEs show the verified marketplace and project initialization commands.
- Existing tests and cross-platform validation remain green.
