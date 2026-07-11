# Gearshift MVP Design

**Date:** 2026-07-11  
**Status:** Approved for planning  
**Repository:** `bowlofnoodles/gearshift`  
**License:** MIT

## 1. Summary

Gearshift is an installable workflow plugin for AI coding agents. It selects a development process that matches task complexity instead of applying the heaviest process to every change.

Users may describe work naturally and let Gearshift classify it, or explicitly select one of three gears:

- **Quick** for clear, localized changes that should be implemented immediately.
- **Standard** for bounded work that benefits from focused questioning and a short plan, without mandatory TDD.
- **Full** for migrations, module rewrites, architectural changes, and other complex work that merits the complete Superpowers methodology.

Gearshift preserves upstream tools as independently upgradable dependencies. It does not patch or fork Superpowers, `grill-me`, or `grill-with-docs`. A Gearshift-owned artifact contract gives every workflow one canonical location for task documents, domain language, and ADRs.

## 2. Motivation

Superpowers is effective at preventing common agent-coding failures: unclear requirements, plan drift, weak testing, ad hoc debugging, unreviewed implementations, and unsupported completion claims. Its discipline is valuable for complex work.

The same discipline becomes process overhead for trivial changes. A request such as “change this button to blue” can trigger brainstorming, design approval, a written spec, an implementation plan, worktree creation, TDD, reviews, and branch-finishing steps. The cost of the workflow can exceed the cost of the change.

Gearshift exists to preserve the reliability of Superpowers where that reliability is valuable while introducing lighter paths for simpler tasks.

The public README must tell this origin story directly. Gearshift should not position itself as a replacement for or criticism of Superpowers. It is a complexity-aware router and integration layer that makes rigorous workflows proportional.

## 3. Goals

1. Route natural-language coding requests through a complexity classifier before any development workflow starts.
2. Allow users to bypass classification with explicit Quick, Standard, or Full commands.
3. Make Quick genuinely fast: no brainstorming, plan, task document, worktree, or mandatory TDD.
4. Give Standard enough alignment through focused grilling and a short plan without imposing the Full workflow.
5. Use the complete Superpowers workflow for Full tasks.
6. Keep all task and design artifacts under one Gearshift-owned directory contract.
7. Keep third-party Skills unmodified so users can upgrade them independently.
8. Support Codex and Claude Code with equivalent user-facing semantics.
9. Recover Standard and Full tasks across interrupted or new sessions from repository state rather than model memory.
10. Be distributable as a polished open-source plugin with English and Simplified Chinese documentation.

## 4. Non-goals

The MVP will not:

- Replace the implementation, TDD, debugging, or review disciplines provided by Superpowers.
- Vendor or fork third-party Skill content.
- Implement the former Trellis runtime, CLI, hooks, task engine, or journal system.
- Guarantee correct routing through Skill descriptions alone.
- Automatically install or upgrade third-party dependencies without user approval.
- Add a `/gear:update` command; plugin distribution handles MVP upgrades.
- Create task records for Quick changes by default.
- Provide a hosted service, MCP server, telemetry service, or external database.

## 5. Research Findings

### 5.1 Superpowers

Superpowers is a complete, mandatory software-development methodology. Its documented path covers brainstorming, worktrees, detailed planning, subagent or batch execution, TDD, review, verification, and branch completion.

Strengths:

- Strong end-to-end quality loop.
- Explicit design and approval gates.
- Evidence-driven debugging and completion.
- Detailed plans and review discipline for long-running work.

Trade-off:

- The default methodology does not scale down naturally for obvious localized changes.

Source: <https://github.com/obra/superpowers#the-basic-workflow>

### 5.2 grill-me

`grill-me` is a small user-invoked entry to the reusable `grilling` discipline. It asks one decision question at a time, investigates facts from the codebase rather than asking the user, provides a recommendation, and does not enact the plan before shared understanding.

It fits Standard work because it improves alignment without owning the rest of the development lifecycle.

Source: <https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md>

### 5.3 grill-with-docs

The formal Skill name is `grill-with-docs`. It combines grilling with domain modeling. It sharpens terminology, checks statements against code, stress-tests domain boundaries with scenarios, updates a glossary, and creates ADRs only for decisions that are hard to reverse, surprising without context, and based on a real trade-off.

It fits Standard work that changes domain language or boundaries, and parts of Full discovery, provided its output paths are governed by Gearshift.

Source: <https://github.com/mattpocock/skills/blob/main/skills/engineering/domain-modeling/SKILL.md>

### 5.4 Trellis

Trellis is a project-level agent harness centered on scoped specs, task artifacts, workflow state, context injection, and cross-session journals. Its data model is useful inspiration for Gearshift's artifact contract and recovery behavior.

Trellis explicitly advises against running two workflow frameworks as peer controllers in one session because competing phase prompts, hooks, and routing rules make behavior unpredictable. Gearshift therefore borrows task and context ideas without adopting Trellis as a second runtime controller.

Sources:

- <https://github.com/mindfold-ai/trellis>
- <https://docs.trytrellis.app/advanced/appendix-f>
- <https://docs.trytrellis.app/advanced/custom-workflow>

### 5.5 Codex customization

Codex Skills expose metadata for discovery and can be selected implicitly when a request matches a Skill description. A plugin is the installable distribution unit for Skills, hooks, scripts, and other components. `AGENTS.md` provides durable repository guidance applied before work starts.

Because implicit Skill matching is model-selected rather than a declared total ordering between installed plugins, Gearshift must not rely on its Skill description alone to outrank Superpowers. It will combine plugin startup guidance, a small managed `AGENTS.md` block, explicit commands, broad Router metadata, and behavior tests.

Sources:

- <https://developers.openai.com/codex/concepts/customization#agents-guidance>
- <https://developers.openai.com/codex/concepts/customization#skills>
- <https://developers.openai.com/codex/plugins/build#plugin-structure>

## 6. Considered Architectures

### 6.1 Selected: Gearshift router with specialized downstream engines

Gearshift is the only top-level workflow router. Quick is implemented by Gearshift, Standard delegates discovery to Matt Pocock Skills, and Full delegates to Superpowers.

Benefits:

- Directly solves excessive process overhead.
- Preserves the user's established Superpowers workflow.
- Keeps upstream dependencies independently upgradable.
- Makes documentation and commands consistent across gears.

Costs:

- Requires careful routing prompts and compatibility tests.
- Requires thin platform adapters for Codex and Claude Code.

### 6.2 Rejected: Trellis as the primary runtime

This provides mature task state and context injection, but requires migrating away from the user's existing Superpowers workflow and introduces another strong framework with CLI, hook, template, and migration maintenance.

### 6.3 Partially adopted: explicit commands only

Explicit gear commands are retained as deterministic overrides, but an explicit-only design was rejected because users would have to classify every request themselves.

## 7. High-level Architecture

```text
User request
    |
    +-- explicit /gear:quick|standard|full -------------------+
    |                                                          |
    +-- natural language --> Complexity Router                 |
                              |                                |
                              +--> Quick ----------------------+--> execution
                              +--> Standard --> grilling ------+--> artifacts
                              +--> Full --> Superpowers --------+--> verification
```

Components:

1. **Bootstrap guidance** makes Gearshift the entry point for coding changes.
2. **Complexity Router** selects a gear for natural-language requests.
3. **Gear workflows** define the exact process for Quick, Standard, and Full.
4. **Artifact Contract** defines paths, required documents, and validation.
5. **Task State** makes Standard and Full resumable.
6. **Platform adapters** expose equivalent Codex and Claude Code commands and hooks.
7. **Doctor** diagnoses installation, routing, dependencies, managed guidance, and artifacts.
8. **Compatibility suite** verifies third-party versions and coexistence behavior.

## 8. Routing Semantics

### 8.1 User-facing gears

| Gear | Explicit entry | Intended scope |
| --- | --- | --- |
| Quick | `/gear:quick` | Clear, localized, low-branching changes |
| Standard | `/gear:standard` | Bounded features or fixes needing some decisions |
| Full | `/gear:full` | Migrations, cross-system work, module rewrites, architecture |

The exact platform syntax may differ internally, but the user-facing `gear:*` vocabulary remains stable.

Natural-language equivalents such as “do this as quick” or “use the full process” are accepted.

### 8.2 Precedence

```text
Explicit gear selection
    > project-specific classification rules
        > Router classification
```

### 8.3 Classification signals

The Router considers:

- Requirement clarity.
- Scope locality.
- Number of modules and dependency edges.
- Number of unresolved decisions.
- Public API or data-model changes.
- Domain-rule changes.
- Migration and compatibility requirements.
- Need for staged delivery.
- Likelihood that work exceeds one agent context.

File count is a signal, not a hard classification rule.

### 8.4 Router behavior

- For automatic classification, state the chosen gear and a one-sentence reason, then continue without waiting.
- Natural-language tasks may upgrade automatically if hidden complexity is discovered; the agent must explain why.
- An explicitly selected Quick task that crosses a complexity boundary pauses and requests permission to upgrade.
- An explicitly selected Full task never silently downgrades.
- No task silently changes gear.

## 9. Gear Workflows

### 9.1 Quick

```text
Classify or select Quick
-> inspect relevant code
-> implement directly
-> run proportionate verification
-> report outcome
```

Quick skips:

- Grilling and brainstorming.
- Design documents.
- Implementation plans.
- Worktrees.
- Mandatory TDD.
- Subagent review.
- Task-directory creation.

Verification remains proportional to the change. Examples include a formatter, targeted build, local type check, relevant existing test, configuration parser, or visual inspection.

### 9.2 Standard

```text
Classify or select Standard
-> create canonical task directory
-> grill-me
-> optionally grill-with-docs
-> write a short plan
-> implement in the current workspace
-> run existing relevant verification
-> ask whether to add new tests
-> complete and summarize
```

Rules:

- Use `grill-me` for ordinary bounded decisions.
- Use `grill-with-docs` when work affects domain language, boundaries, or durable architectural decisions.
- Do not invoke the full Superpowers brainstorming workflow.
- Do not require a worktree.
- Do not require test-first development.
- After implementation, run relevant existing tests, lint, type checks, or builds.
- Ask the user whether to add new tests after implementation.
- Do not require Full's per-task dual review workflow.

### 9.3 Full

```text
Classify or select Full
-> create canonical task directory
-> Superpowers brainstorming and design approval
-> detailed writing-plans phase
-> isolated worktree
-> TDD implementation
-> task execution with reviews
-> final verification
-> finish branch
```

Gearshift passes canonical paths into the upstream workflow. Superpowers remains unmodified.

## 10. Artifact Contract

### 10.1 Repository layout

```text
.gear/
├── .gitignore
├── config.yaml
├── index.md
├── context/
│   ├── glossary.md
│   └── architecture.md
├── adr/
│   └── 0001-*.md
├── tasks/
│   └── YYYY-MM-DD-task-name/
│       ├── task.json
│       ├── brief.md
│       ├── design.md
│       ├── plan.md
│       ├── research/
│       └── summary.md
└── .runtime/
    └── current-task
```

### 10.2 Git behavior

`.gear/.gitignore` contains:

```gitignore
/.runtime/
*.tmp
*.lock
```

The shared configuration, task artifacts, context, and ADRs are tracked. Local session pointers are ignored. A nested `.gear/.gitignore` avoids modifying the repository's root ignore file.

If the root `.gitignore` excludes all of `.gear/`, initialization and Doctor report an error because shared artifacts cannot be committed.

### 10.3 Document responsibilities

`brief.md` contains:

- Problem and goal.
- Scope and non-scope.
- Acceptance criteria.
- Confirmed user decisions.

`design.md` contains:

- Technical approach.
- Components and boundaries.
- Data flow.
- Important trade-offs.
- Error handling.

`plan.md` contains:

- Implementation order.
- Expected file changes.
- Step-specific verification.
- Dependencies.

`summary.md` contains:

- Work actually completed.
- Deviations from the plan.
- Verification evidence.
- Test decision.
- Follow-up work.

`context/glossary.md` contains only domain language, not implementation details. `context/architecture.md` describes the current architecture. `adr/` contains only durable decisions that meet the ADR threshold.

### 10.4 Required artifacts by gear

| Artifact | Quick | Standard | Full |
| --- | --- | --- | --- |
| `task.json` | No | Required | Required |
| `brief.md` | No | Required | Required |
| `design.md` | No | When needed | Required |
| `plan.md` | No | Required, concise | Required, detailed |
| `research/` | No | When needed | When needed |
| `summary.md` | No | Required | Required |
| Glossary / ADR | No | When needed | When needed |

If Quick upgrades to Standard, Gearshift creates the task directory at that moment and captures relevant prior investigation in `brief.md`.

### 10.5 Validation

Before invoking a third-party Skill, Gearshift supplies absolute target paths. After the Skill completes, an Artifact Validator checks:

- Required files exist.
- Internal document links resolve.
- No upstream default path was used accidentally.
- No duplicate `CONTEXT.md` or `docs/superpowers/specs/` tree was created.

Unexpected files are reported and preserved. Gearshift never silently deletes or relocates them because doing so may break references.

## 11. Task State and Continuation

`task.json` stores machine-readable state, not prose design content.

States:

```text
planning -> ready -> implementing -> verifying -> completed
```

Exceptional states:

```text
blocked
cancelled
```

The task record includes:

- Stable task ID and title.
- Current complexity.
- Status and phase.
- Creation and update timestamps.
- Artifact paths.
- Engines used.
- Complexity-change history and reasons.

`/gear:continue` resumes Standard or Full work by reading the runtime pointer, task state, artifacts, Git status, and actual changes. It does not repeat completed grilling, re-ask resolved decisions, recreate task directories, or discard edits.

Recovery behavior:

- One active task: suggest or resume it.
- Multiple active tasks: ask the user to select one.
- Missing pointer with one incomplete task: suggest that task.
- State disagrees with files: inspect evidence and propose a repair.
- Never infer progress from model memory alone.

## 12. Initialization

`/gear:init` is a one-time, idempotent setup command for each consumer repository.

It:

1. Creates the canonical `.gear/` directory structure.
2. Creates or safely extends `.gear/.gitignore`.
3. Creates default `config.yaml` and `index.md` without overwriting user changes.
4. Creates the ignored `.runtime/` directory.
5. Adds a versioned managed Router block to `AGENTS.md` and/or `CLAUDE.md`.
6. Detects Superpowers and Matt Pocock Skills.
7. Shows missing dependency installation steps and requires confirmation before installation.
8. Runs the first Doctor check.
9. Reports which Gearshift files are tracked and ignored.

Managed guidance uses bounded markers:

```md
<!-- GEARSHIFT:START -->
For every coding change, invoke the Gearshift complexity router before
any third-party development workflow. Explicit gear selection wins.
Do not invoke Superpowers directly unless Gearshift selected Full or
the user explicitly requested a specific Superpowers skill.
<!-- GEARSHIFT:END -->
```

Initialization preserves all content outside this block. Repeated initialization updates the managed block only when required and never overwrites user configuration silently.

## 13. Dependency and Compatibility Model

Gearshift dependencies remain external:

```text
Gearshift
├── Quick: standalone
├── Standard: grill-me + grill-with-docs
└── Full: Superpowers
```

A shipped compatibility manifest records tested ranges and the gears that require each dependency.

Behavior:

- Quick remains available without third-party dependencies.
- Missing Standard or Full dependencies stop that workflow with actionable installation guidance.
- Gearshift does not silently substitute another process.
- Gearshift does not silently install or update dependencies.
- Stable dependency versions are pinned or bounded by tested compatibility ranges.
- New dependency versions are adopted only after compatibility evaluation.

## 14. Routing Conflict Mitigation

When Gearshift and Superpowers are installed together, Superpowers becomes a downstream Full engine rather than a peer controller.

Layers of protection:

1. Plugin startup guidance declares Gearshift the coding entry point.
2. `AGENTS.md` or `CLAUDE.md` makes the rule durable in the repository.
3. Router metadata broadly matches coding changes.
4. Explicit `/gear:*` commands bypass implicit matching.
5. Full is the only normal workflow permitted to invoke the complete Superpowers methodology.
6. Doctor detects missing or conflicting guidance.
7. Behavioral evaluations run with both plugins enabled.

If Superpowers begins brainstorming before classification, Gearshift guidance requires the agent to stop expansion, run the Router, and continue according to the selected gear.

Implicit Skill selection cannot be treated as a formal deterministic scheduler. The combined guidance, hooks, explicit commands, and tests reduce misrouting; explicit gear commands remain the deterministic user override.

## 15. Doctor

`/gear:doctor` is read-only. It checks:

- Gearshift installation and version.
- Dependency presence and compatibility.
- Managed `AGENTS.md` and `CLAUDE.md` blocks.
- Hook availability and configuration.
- `.gear/` structure and configuration.
- Git tracking of shared artifacts and ignoring of `.runtime/`.
- Conflicting workflow guidance.
- Stray third-party artifact directories.
- Representative routing scenarios.

Doctor reports fixes but does not apply them without a separate user-approved action.

`/gear:update` is deferred beyond MVP. Plugin marketplace or Git installation mechanisms update Gearshift; users run Doctor afterward.

## 16. Error Handling

| Condition | Required behavior |
| --- | --- |
| Dependency missing | Stop the affected gear and show installation guidance |
| Dependency incompatible | Stop delegation and recommend a tested version |
| Artifact written elsewhere | Preserve it, report the conflict, request a decision |
| Hidden complexity found | Upgrade automatically or request permission according to selection mode |
| Standard scope expands substantially | Upgrade to Full and preserve existing artifacts |
| Existing verification fails | Distinguish baseline failure from regression; never claim completion |
| Session interrupted | Recover from task state, artifacts, Git, and working-tree evidence |
| Hook unavailable | Use managed repository guidance and warn through Doctor |
| Managed block changed | Show the difference and require confirmation before repair |
| Init repeated | Perform an idempotent merge without overwriting user content |

## 17. Plugin Distribution

The repository is both the source project and the initial distribution source.

Planned structure:

```text
gearshift/
├── .codex-plugin/plugin.json
├── .claude-plugin/plugin.json
├── skills/
├── hooks/
├── scripts/
├── templates/
├── tests/
├── assets/
├── docs/
├── README.md
├── README.zh-CN.md
├── CONTRIBUTING.md
├── CHANGELOG.md
└── LICENSE
```

Distribution sequence:

1. Direct GitHub and Git-backed marketplace installation.
2. Codex repository marketplace.
3. Claude Code plugin marketplace.
4. Public plugin-directory submission after the workflow stabilizes.

Logical MVP commands:

```text
/gear:init
/gear:quick
/gear:standard
/gear:full
/gear:continue
/gear:doctor
```

Codex and Claude Code use their native explicit-invocation conventions while keeping the action names short and equivalent:

| Action | Codex | Claude Code |
| --- | --- | --- |
| Initialize | `$gearshift:init` | `/gear:init` |
| Quick | `$gearshift:quick` | `/gear:quick` |
| Standard | `$gearshift:standard` | `/gear:standard` |
| Full | `$gearshift:full` | `/gear:full` |
| Continue | `$gearshift:continue` | `/gear:continue` |
| Doctor | `$gearshift:doctor` | `/gear:doctor` |

## 18. README and Project Presentation

`README.md` is English-first. `README.zh-CN.md` is a complete Simplified Chinese translation. Both link to each other at the top.

The README must include:

- A repository-owned SVG logo and icon using the gearshift metaphor.
- A centered hero, concise tagline, and language switcher.
- Real badges only: License, release, CI, and compatibility after those systems exist.
- The motivating Superpowers process-overhead story.
- A Quick/Standard/Full comparison.
- A routing diagram.
- Installation instructions for Codex and Claude Code.
- A 30-second initialization and usage example.
- Command reference.
- Natural-language routing examples.
- Artifact-contract explanation.
- Relationship to Superpowers, Matt Pocock Skills, and Trellis.
- Compatibility, troubleshooting, contributing, and license sections.

The positioning is:

> The right development process for the task at hand.

The README must not display fabricated download counts, coverage, CI status, or other community metrics.

## 19. Test Strategy

### 19.1 Static validation

- Validate Codex and Claude Code plugin manifests.
- Validate Skill metadata and referenced resources.
- Verify command names match implementations.
- Verify no deprecated project name or command prefix remains.
- Validate generated JSON, YAML, Markdown links, and SVG assets.

### 19.2 Router behavior

Representative cases:

| Request | Expected result |
| --- | --- |
| “Change the button to blue” | Quick |
| “Add batch refunds; clarify failure handling” | Standard |
| “Extract payments into a standalone service” | Full |
| Explicit Quick for a new order state machine | Pause on complexity conflict |
| Explicit Full for a color change | Full; no silent downgrade |

### 19.3 Coexistence matrix

Test:

- Gearshift alone.
- Gearshift with Superpowers.
- Gearshift with Matt Pocock Skills.
- All dependencies installed.
- Codex.
- Claude Code.

Assert:

- Natural-language coding work enters the Router first.
- Superpowers does not expand during Quick or Standard.
- Standard does not mandate TDD.
- Full invokes the complete Superpowers workflow.
- Artifacts remain inside `.gear/`.

### 19.4 Initialization

Test:

- Empty repository.
- Existing `AGENTS.md`.
- Existing `CLAUDE.md`.
- Repeated initialization.
- Root ignore rule excluding `.gear/`.
- Existing customized Gearshift configuration.
- Managed block from an older Gearshift version.
- `.runtime/` is ignored while shared artifacts remain trackable.

### 19.5 Artifact contract

Assert:

- Quick creates no task directory by default.
- Standard creates `task.json`, `brief.md`, `plan.md`, and `summary.md`.
- Standard creates `design.md` only when needed.
- Full creates all required core documents.
- Internal links resolve.
- Unexpected upstream default directories are reported.

### 19.6 Recovery

Test interrupted tasks at each state, missing pointers, multiple active tasks, stale task state, working-tree changes, and failed verification. `/gear:continue` must never repeat approved discovery or discard work.

## 20. MVP Acceptance Criteria

The MVP is complete when:

1. Gearshift installs as a valid Codex plugin and Claude Code plugin.
2. `/gear:init` safely initializes an empty or existing repository and is idempotent.
3. Natural-language requests select the expected gear in the acceptance scenarios.
4. Explicit gear commands bypass automatic classification.
5. Quick performs a localized change without creating workflow artifacts.
6. Standard uses focused grilling, writes canonical artifacts, avoids mandatory TDD, and asks about new tests after implementation.
7. Full invokes Superpowers while keeping all documents in canonical Gearshift paths.
8. `/gear:continue` resumes interrupted Standard and Full tasks from evidence.
9. `/gear:doctor` diagnoses dependencies, routing guidance, Git behavior, and artifact conflicts without mutation.
10. Third-party Skill files remain unmodified.
11. Compatibility and coexistence tests pass for the supported dependency versions.
12. English and Simplified Chinese READMEs are polished, accurate, and include the project origin story.
13. Repository-owned SVG branding, MIT license, contributing guide, and changelog are present.

## 21. Deferred Work

- `/gear:update` with controlled project-template migrations.
- Public plugin-directory submission.
- Additional coding-agent platforms.
- Optional project memory or journal features beyond task continuation.
- Configurable team policy profiles.
- Rich routing telemetry or analytics, only with explicit privacy design and user consent.
- A formal machine scheduler if future platforms expose deterministic workflow interception.
