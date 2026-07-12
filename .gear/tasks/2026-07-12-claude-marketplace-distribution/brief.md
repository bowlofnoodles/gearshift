# Claude Marketplace Distribution: Brief

## Goal

Give Claude Code users the same repository-marketplace installation experience already available to Codex, and release the cross-platform distribution update as Gearshift `0.1.1`.

## Scope

- Add `.claude-plugin/marketplace.json` owned by this repository.
- Keep the existing repository-root Claude plugin layout.
- Validate the marketplace and plugin with Claude Code 2.1.187.
- Prove local-checkout and GitHub-source installation in isolated Claude configuration homes.
- Update both READMEs, release metadata, and the changelog.

## Decisions and constraints

- Use the marketplace name `gearshift` and plugin selector `gearshift@gearshift` on both platforms.
- Try the relative source `./` so no repository restructuring is required.
- Keep Codex and Claude plugin versions identical.
- Publish this additive distribution change as `0.1.1` after PR merge and a clean `main` smoke test.
- Do not modify or vendor third-party workflow Skills.

## Acceptance criteria

- `claude plugin validate .` accepts the repository marketplace and plugin.
- `claude plugin marketplace add bowlofnoodles/gearshift` succeeds after merge-equivalent Git testing.
- `claude plugin install gearshift@gearshift` installs and enables version `0.1.1`.
- The installed cache contains Gearshift commands, hooks, Skills, scripts, and templates.
- Codex marketplace installation remains valid at version `0.1.1`.
- Bilingual documentation contains verified commands for both platforms.
