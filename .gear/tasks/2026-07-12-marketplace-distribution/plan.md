# Marketplace Distribution: Plan

1. Add a failing manifest test for `.agents/plugins/marketplace.json` and its Gearshift entry.
2. Add the smallest marketplace metadata that points to the repository-root plugin.
3. Validate the plugin and marketplace structure with repository tests and current Codex CLI behavior.
4. Use an isolated `CODEX_HOME` to install from the local checkout, then repeat from `bowlofnoodles/gearshift@main`.
5. If root-source installation is unsupported, package a separate marketplace repository and repeat the tests.
6. Replace MVP placeholder installation text in both READMEs with verified commands and lifecycle notes.
7. Run the full test suite, public-contract validation, artifact validation, and whitespace checks.
8. Record verification and the post-implementation test decision in `summary.md`, complete the task, commit, push, and open a PR.
