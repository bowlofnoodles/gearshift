# Claude Marketplace Distribution: Plan

1. Add failing manifest tests for the Claude marketplace and unified `0.1.1` version metadata.
2. Add `.claude-plugin/marketplace.json` with the repository root as its plugin source.
3. Validate the local marketplace with `claude plugin validate .` and an isolated local install.
4. Bump Codex, Claude, package, and compatibility versions together; add the changelog entry.
5. Push a checkpoint and repeat marketplace add/install from the GitHub feature branch.
6. Replace Claude source-only installation guidance in both READMEs with verified marketplace commands while retaining `--plugin-dir` as a development option.
7. Run all repository tests, public-contract checks, Claude validation, artifact validation, and whitespace checks.
8. Complete the task record, commit, push, open a PR, and monitor the full CI matrix.
