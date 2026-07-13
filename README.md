# Gearshift

[中文 README](README.zh-CN.md)

Gearshift is a Codex workflow router with two modes:

| Mode | Best for | Workflow |
| --- | --- | --- |
| **Quick** ⚡ | Clear, localized changes | Inspect → edit → proportionate verification |
| **Complex** 🧭 | Anything with unresolved requirements, docs, public contracts, migrations, or broader scope | `grill-me` + `grill-with-docs` requirements Q&A → Codex plan mode → implement → verify |

## Why Gearshift exists

A tiny button-color change should not pay for heavyweight planning. A feature or migration still needs enough alignment before code changes. Gearshift keeps that choice explicit: Quick stays direct, while Complex uses lightweight questioning and Codex's built-in plan mode.

## Requirements

- Node.js 18 or newer.
- Codex.
- Quick has no third-party workflow dependency.
- Complex uses externally installed [`grill-me` and `grill-with-docs`](https://github.com/mattpocock/skills) for requirements clarification.

Claude plugin support is intentionally out of scope for now; this README documents the Codex workflow only.

## Commands

| Task | Codex |
| --- | --- |
| Initialize | `$gearshift:init` |
| Quick | `$gearshift:quick` |
| Complex | `$gearshift:complex` |
| Doctor | `$gearshift:doctor` |

Natural language is classified automatically. Explicit Quick or Complex always wins, except explicit Quick pauses if the request clearly needs Complex.

## How it works

Gearshift is the top-level workflow router in an initialized repository. The managed project guidance and startup hook tell the agent to classify coding work before loading another workflow controller.

- Quick runs directly with no extra workflow.
- Complex runs `grill-me` and `grill-with-docs` for Q&A, then uses Codex plan mode before implementation.

Gearshift does not constrain where Complex notes or plans are written: `grill-me`, `grill-with-docs`, and Codex plan mode can each use their native document behavior. Quick also creates no workflow documents by default.

## Troubleshooting

Run `doctor` when initialization, dependencies, or artifact paths look wrong. Gearshift reports issues but does not silently repair user-owned content.

## FAQ

**Does Gearshift still have Standard and Full?**  
No. Gearshift now has only Quick and Complex.

**Does Gearshift require Superpowers?**  
No. Complex uses `grill-me`, `grill-with-docs`, and Codex plan mode.

## License

MIT.
