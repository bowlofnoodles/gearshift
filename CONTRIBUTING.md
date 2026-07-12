# Contributing to Gearshift

Thanks for helping make agent-coding workflow proportional and predictable.

## Development setup

Gearshift requires Node.js 18 or newer and has zero runtime npm dependencies.

```bash
git clone https://github.com/bowlofnoodles/gearshift.git
cd gearshift
npm test
```

Create a focused branch, keep changes scoped, and preserve user files in test fixtures. Runtime code should continue to use the Node.js standard library unless a dependency is discussed first.

## Validation

Run the full suite:

```bash
npm test
npm run validate
```

Validate every Skill you change:

```bash
for skill in skills/*; do
  python3 /path/to/skill-creator/scripts/quick_validate.py "$skill"
done
```

The validator script is named `quick_validate.py` and requires PyYAML in the Python environment.

Validate the Codex plugin with the current `plugin-creator` validator before submitting plugin-manifest changes.

## Routing policy changes

Changes to Quick, Standard, Full, explicit overrides, or upgrade rules must include representative cases in `tests/router-cases.json` and assertions in `tests/router.test.mjs`. Keep gear coverage balanced and use task complexity terminology consistently.

Generate platform-neutral eval prompts with:

```bash
node scripts/eval-router.mjs
```

## Third-party boundaries

Do not vendor, copy, or edit Superpowers, `grill-me`, or `grill-with-docs` Skills. Gearshift integrates compatible external installations through explicit contracts so upstream projects remain independently upgradable.

## Pull requests

- Explain the behavior change and its motivation.
- Include verification evidence.
- Update both READMEs for user-facing changes.
- Keep badges and compatibility claims tied to real repository state.
- Do not commit `.gear/.runtime/`, temporary files, or local plugin caches.
