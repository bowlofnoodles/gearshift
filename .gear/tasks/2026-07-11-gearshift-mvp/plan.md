# Gearshift MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish the first testable Gearshift plugin, with complexity-aware Quick, Standard, and Full workflows for Codex and Claude Code, canonical `.gear/` artifacts, resumable tasks, diagnostics, and polished bilingual documentation.

**Architecture:** Gearshift is the sole top-level router. Markdown Skills hold workflow policy, a dependency-free Node.js CLI performs deterministic initialization/state/diagnostics, and thin platform adapters expose Claude slash commands and Codex namespaced Skills. Third-party Skills remain external and are invoked only by Standard or Full.

**Tech Stack:** Node.js 18+ standard library, ECMAScript modules, `node:test`, Markdown Agent Skills, Codex plugin manifest, Claude Code plugin manifest/commands, JSON/YAML artifacts, SVG.

## Global Constraints

- The public name is `Gearshift`; the old repository working-directory name must not appear in shipped files.
- User-facing gears are exactly `Quick`, `Standard`, and `Full`.
- Canonical logical commands are `gear:init`, `gear:quick`, `gear:standard`, `gear:full`, `gear:continue`, and `gear:doctor`.
- Claude Code exposes `/gear:*`; Codex exposes short namespaced Skills such as `$gearshift:init`. Do not repeat `gear` inside Skill names and do not use deprecated Codex custom prompts.
- Natural-language coding requests must enter the Complexity Router before Superpowers or other workflow controllers.
- Quick is standalone and creates no task artifacts by default.
- Standard uses external `grill-me` or `grill-with-docs`, does not mandate TDD, and asks about new tests after implementation.
- Full delegates to an externally installed compatible Superpowers and keeps artifacts under `.gear/`.
- Never copy, edit, or vendor third-party Skill files.
- Runtime code has zero npm dependencies and supports Node.js 18 or newer.
- Shared artifacts are tracked; `.gear/.runtime/`, `*.tmp`, and `*.lock` are ignored through `.gear/.gitignore`.
- Initialization is idempotent and modifies only Gearshift-managed blocks in `AGENTS.md` and `CLAUDE.md`.
- `gear:doctor` is read-only.
- README badges must represent real repository state; do not fabricate downloads, coverage, releases, or compatibility.
- The license is MIT.

---

## File Map

### Plugin and package metadata

- `.codex-plugin/plugin.json` — Codex plugin identity, Skill path, presentation metadata.
- `.claude-plugin/plugin.json` — Claude Code plugin identity and version.
- `package.json` — Node version floor and validation/test commands.
- `compatibility.json` — tested third-party dependency ranges and required gears.

### Runtime

- `scripts/gear.mjs` — CLI dispatch for `init`, `task`, `continue`, `doctor`, and `validate-artifacts`.
- `scripts/lib/paths.mjs` — canonical consumer-repository paths.
- `scripts/lib/files.mjs` — atomic writes, managed blocks, and ignore-rule merging.
- `scripts/lib/init.mjs` — deterministic repository initialization.
- `scripts/lib/tasks.mjs` — task state creation, discovery, transition, and continuation.
- `scripts/lib/skills.mjs` — installed-Skill discovery and version evidence.
- `scripts/lib/doctor.mjs` — read-only diagnostic checks.
- `scripts/lib/artifacts.mjs` — artifact-contract validation.

### Workflow content

- `skills/using-gearshift/SKILL.md` — mandatory bootstrap and Router precedence.
- `skills/complexity-router/SKILL.md` — automatic classification contract.
- `skills/init/SKILL.md` — explicit initialization workflow (`$gearshift:init` in Codex).
- `skills/quick/SKILL.md` — Quick execution contract (`$gearshift:quick` in Codex).
- `skills/standard/SKILL.md` — Standard discovery, plan, implementation, and test decision.
- `skills/full/SKILL.md` — Full delegation to Superpowers with path overrides.
- `skills/continue/SKILL.md` — evidence-based task continuation.
- `skills/doctor/SKILL.md` — read-only diagnostics.
- `skills/artifact-contract/SKILL.md` — canonical paths and document responsibilities.
- `commands/gear/*.md` — Claude slash-command adapters that invoke the matching Gearshift Skill.
- `hooks/hooks.json` — shared plugin-bundled `SessionStart` registration.
- `hooks/session-start.mjs` — compact Router precedence context for supported hosts.

### Templates and presentation

- `templates/gear/config.yaml` — default project configuration.
- `templates/gear/index.md` — task index starter.
- `templates/gear/glossary.md` — domain glossary starter.
- `templates/gear/architecture.md` — architecture context starter.
- `assets/logo.svg`, `assets/icon.svg` — repository-owned branding.
- `README.md`, `README.zh-CN.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `LICENSE` — public project documentation.

### Tests

- `tests/manifests.test.mjs` — plugin/package schema invariants.
- `tests/init.test.mjs` — initialization and managed-file behavior.
- `tests/tasks.test.mjs` — task states and continuation selection.
- `tests/doctor.test.mjs` — dependency/routing/Git diagnostics without mutation.
- `tests/artifacts.test.mjs` — required artifacts and stray-path reporting.
- `tests/skills.test.mjs` — Skill metadata, triggers, commands, and forbidden legacy strings.
- `tests/fixtures/` — isolated consumer repositories and installed-Skill trees.

---

### Task 1: Establish the plugin package and validation harness

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `.codex-plugin/plugin.json`
- Create: `.claude-plugin/plugin.json`
- Create: `compatibility.json`
- Create: `tests/manifests.test.mjs`

**Interfaces:**
- Produces: `npm test`, `npm run validate`, and machine-readable plugin/compatibility metadata used by all later tasks.

- [ ] **Step 0: Ignore project-local execution scratch**

Create `.gitignore` with:

```gitignore
node_modules/
coverage/
/.superpowers/
```

This root ignore file is for developing Gearshift itself. It is separate from the nested `.gear/.gitignore` that Gearshift installs in consumer repositories.

- [ ] **Step 1: Write failing manifest tests**

Create `tests/manifests.test.mjs` with tests that load all JSON files and assert:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const load = async (path) => JSON.parse(await readFile(path, "utf8"));

test("Codex manifest exposes the Gearshift skills", async () => {
  const manifest = await load(".codex-plugin/plugin.json");
  assert.equal(manifest.name, "gearshift");
  assert.equal(manifest.version, "0.1.0");
  assert.equal(manifest.license, "MIT");
  assert.equal(manifest.skills, "./skills/");
  assert.deepEqual(manifest.interface.capabilities, ["Read", "Write"]);
});

test("Claude manifest uses the same identity and version", async () => {
  const codex = await load(".codex-plugin/plugin.json");
  const claude = await load(".claude-plugin/plugin.json");
  assert.equal(claude.name, codex.name);
  assert.equal(claude.version, codex.version);
});

test("compatibility declares optional engines by gear", async () => {
  const compatibility = await load("compatibility.json");
  assert.deepEqual(compatibility.dependencies.superpowers.requiredFor, ["full"]);
  assert.deepEqual(
    compatibility.dependencies["mattpocock-skills"].requiredFor,
    ["standard"],
  );
});
```

- [ ] **Step 2: Run the tests and verify the missing-file failure**

Run: `node --test tests/manifests.test.mjs`  
Expected: FAIL with `ENOENT` for `.codex-plugin/plugin.json`.

- [ ] **Step 3: Create package and plugin manifests**

Create `package.json`:

```json
{
  "name": "gearshift-agent-workflow",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=18" },
  "scripts": {
    "test": "node --test",
    "validate": "node --test tests/manifests.test.mjs tests/skills.test.mjs"
  }
}
```

Create the Codex manifest using the plugin-creator validator's accepted schema. Set `name`, `version`, description, author name `bowlofnoodles`, repository URL, MIT license, keywords, `skills: "./skills/"`, and an `interface` with display name, descriptions, category `Coding`, capabilities `Read` and `Write`, project URL, orange brand color, and three starter prompts. Omit icon and logo fields until Task 9 creates the referenced assets.

Create `.claude-plugin/plugin.json` with the same name, version, description, author, repository, and license values.

Create `compatibility.json`:

```json
{
  "schemaVersion": 1,
  "gearshift": "0.1.0",
  "dependencies": {
    "superpowers": {
      "supported": ">=6.1.0 <7.0.0",
      "requiredFor": ["full"]
    },
    "mattpocock-skills": {
      "supported": ">=1.1.0 <2.0.0",
      "requiredFor": ["standard"]
    }
  }
}
```

- [ ] **Step 4: Run manifest tests**

Run: `npm test -- --test-name-pattern="manifest|compatibility|Codex|Claude"`  
Expected: all Task 1 tests PASS.

- [ ] **Step 5: Validate the Codex plugin shape**

Run:

```bash
python3 /Users/bowlofnoodles/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py .
```

Expected: plugin validation succeeds with no schema errors.

- [ ] **Step 6: Commit package foundation**

```bash
git add .gitignore package.json .codex-plugin .claude-plugin compatibility.json tests/manifests.test.mjs
git commit -m "chore: scaffold Gearshift plugin"
```

---

### Task 2: Build canonical paths and safe file operations

**Files:**
- Create: `scripts/lib/paths.mjs`
- Create: `scripts/lib/files.mjs`
- Create: `tests/files.test.mjs`

**Interfaces:**
- Produces: `gearPaths(root)`, `writeIfMissing(path, content)`, `writeJsonAtomic(path, value)`, `upsertManagedBlock(content, marker, body)`, and `mergeLines(content, requiredLines)`.

- [ ] **Step 1: Write failing unit tests**

Cover exact path resolution, non-overwriting writes, atomic JSON, managed-block insertion/replacement, preservation of surrounding user text, and duplicate-free ignore rules. Use `mkdtemp(join(tmpdir(), "gearshift-"))` for isolation.

Core assertions:

```js
assert.equal(gearPaths("/repo").tasks, "/repo/.gear/tasks");
assert.match(upsertManagedBlock("# User\n", "GEARSHIFT", "Router first."), /# User/);
assert.equal(
  upsertManagedBlock(
    "before\n<!-- GEARSHIFT:START -->\nold\n<!-- GEARSHIFT:END -->\nafter\n",
    "GEARSHIFT",
    "new",
  ),
  "before\n<!-- GEARSHIFT:START -->\nnew\n<!-- GEARSHIFT:END -->\nafter\n",
);
assert.equal(mergeLines("/.runtime/\n", ["/.runtime/", "*.tmp", "*.lock"]),
  "/.runtime/\n*.tmp\n*.lock\n");
```

- [ ] **Step 2: Verify tests fail before implementation**

Run: `node --test tests/files.test.mjs`  
Expected: FAIL with module-not-found for `scripts/lib/paths.mjs`.

- [ ] **Step 3: Implement the path contract**

`gearPaths(root)` must resolve and return `root`, `gear`, `config`, `index`, `context`, `glossary`, `architecture`, `adr`, `tasks`, `runtime`, and `currentTask` using `node:path.resolve/join`.

- [ ] **Step 4: Implement safe file primitives**

Use only `node:fs/promises`. `writeIfMissing` returns `"created"` or `"preserved"`. `writeJsonAtomic` writes `<path>.tmp`, renames it, and ends JSON with a newline. `upsertManagedBlock` rejects an unmatched start/end marker instead of guessing. `mergeLines` preserves existing nonempty lines and appends only missing required lines.

- [ ] **Step 5: Run unit tests**

Run: `node --test tests/files.test.mjs`  
Expected: PASS.

- [ ] **Step 6: Commit file primitives**

```bash
git add scripts/lib/paths.mjs scripts/lib/files.mjs tests/files.test.mjs
git commit -m "feat: add Gearshift file primitives"
```

---

### Task 3: Implement idempotent repository initialization

**Files:**
- Create: `templates/gear/config.yaml`
- Create: `templates/gear/index.md`
- Create: `templates/gear/glossary.md`
- Create: `templates/gear/architecture.md`
- Create: `scripts/lib/init.mjs`
- Create: `scripts/gear.mjs`
- Create: `tests/init.test.mjs`

**Interfaces:**
- Consumes: Task 2 file/path functions.
- Produces: `initializeRepository({ root, guidanceTargets }) -> InitReport` and CLI `node scripts/gear.mjs init --root <repo>`.

- [ ] **Step 1: Write failing initialization tests**

Test an empty repository, existing user guidance, repeated init, unmatched managed markers, and a root `.gitignore` containing `.gear/`. Assert the report has `created`, `preserved`, `warnings`, and `errors` arrays.

Required managed body:

```text
For every coding change, invoke the Gearshift complexity router before any third-party development workflow.
Explicit gear selection wins.
Do not invoke Superpowers directly unless Gearshift selected Full or the user explicitly requested a specific Superpowers skill.
Read .gear/config.yaml for project-specific classification rules and .gear/index.md for active tasks.
```

- [ ] **Step 2: Verify failure**

Run: `node --test tests/init.test.mjs`  
Expected: FAIL because `initializeRepository` is not defined.

- [ ] **Step 3: Add exact templates**

`config.yaml` must contain schema version `1`, default mode `auto`, the three classification signals lists, Standard test policy `ask-after-implementation`, Standard worktree `false`, Full engine `superpowers`, and artifact root `.gear`.

The Markdown templates must contain stable headings only; no placeholder tokens. `index.md` separates Active and Completed tasks. Glossary and architecture templates explain what belongs in each file.

- [ ] **Step 4: Implement initialization**

Create `.gear/`, context, ADR, tasks, and runtime directories. Create or preserve templates. Merge `/.runtime/`, `*.tmp`, and `*.lock` into `.gear/.gitignore`. Upsert Gearshift blocks in requested guidance files. Detect root ignore patterns `.gear`, `.gear/`, `/.gear`, and `/.gear/` and report an error without rewriting the root ignore file.

- [ ] **Step 5: Add CLI dispatch**

`scripts/gear.mjs` parses a command and `--root`; unknown commands exit `2`. Init prints JSON when `--json` is present and a readable checklist otherwise. Exit `1` if the report contains errors.

- [ ] **Step 6: Run tests and a smoke init**

Run:

```bash
node --test tests/init.test.mjs
tmp_repo="$(mktemp -d)"
node scripts/gear.mjs init --root "$tmp_repo"
find "$tmp_repo/.gear" -maxdepth 2 -type f -print | sort
```

Expected: tests PASS; smoke output includes config, index, glossary, architecture, and nested `.gitignore`, but no tracked runtime file.

- [ ] **Step 7: Commit initialization**

```bash
git add templates scripts/gear.mjs scripts/lib/init.mjs tests/init.test.mjs
git commit -m "feat: initialize Gearshift repositories"
```

---

### Task 4: Implement task state and continuation

**Files:**
- Create: `scripts/lib/tasks.mjs`
- Create: `tests/tasks.test.mjs`

**Interfaces:**
- Produces: `createTask`, `readTask`, `transitionTask`, `listIncompleteTasks`, `setCurrentTask`, and `continuationDecision`.

- [ ] **Step 1: Write failing state-machine tests**

Test:

- Standard creation writes `task.json`, `brief.md`, and `plan.md` but not `design.md`.
- Full creation writes `task.json`, `brief.md`, `design.md`, and `plan.md`.
- Allowed state sequence is `planning -> ready -> implementing -> verifying -> completed`.
- Any state may transition to `blocked` or `cancelled`; `blocked` may return to its stored prior state.
- Invalid transitions throw a message naming both states.
- One incomplete task is selected automatically; multiple tasks require user selection.
- Missing runtime pointer never causes completed discovery to repeat.

- [ ] **Step 2: Verify failure**

Run: `node --test tests/tasks.test.mjs`  
Expected: FAIL with module-not-found for `scripts/lib/tasks.mjs`.

- [ ] **Step 3: Implement task records**

Use IDs `YYYY-MM-DD-<lowercase-hyphen-slug>`. Reject duplicate IDs. Store `schemaVersion`, ID, title, complexity, status, phase, timestamps, artifact map, engine map, and history. Use Task 2 atomic JSON writes.

- [ ] **Step 4: Implement transition validation and continuation decisions**

Return one of:

```js
{ action: "resume", task }
{ action: "choose", tasks }
{ action: "start" }
{ action: "repair", task, reasons }
```

Detect state/artifact inconsistencies: missing required artifacts, a completed task still selected in runtime, or a task marked planning with `summary.md` and implementation changes recorded.

- [ ] **Step 5: Extend CLI task and continue commands**

Add `task create`, `task transition`, `task list`, and `continue`. JSON output must be stable for Skill consumption. Human output must show task ID, gear, last completed phase, and next action.

- [ ] **Step 6: Run tests**

Run: `node --test tests/tasks.test.mjs`  
Expected: PASS.

- [ ] **Step 7: Commit task state**

```bash
git add scripts/gear.mjs scripts/lib/tasks.mjs tests/tasks.test.mjs
git commit -m "feat: track and resume Gearshift tasks"
```

---

### Task 5: Implement artifact validation and read-only Doctor

**Files:**
- Create: `scripts/lib/artifacts.mjs`
- Create: `scripts/lib/skills.mjs`
- Create: `scripts/lib/doctor.mjs`
- Create: `tests/artifacts.test.mjs`
- Create: `tests/doctor.test.mjs`
- Create: `tests/fixtures/skills/`

**Interfaces:**
- Produces: `validateTaskArtifacts(root, task) -> Check[]`, `discoverSkills(roots) -> SkillEvidence[]`, and `runDoctor({ root, skillRoots }) -> DoctorReport`.

- [ ] **Step 1: Write failing artifact tests**

Assert required files by gear, resolvable relative Markdown links, and reporting of `docs/superpowers/specs/` or root/nested `CONTEXT.md` outside `.gear/`. Assert validators never delete files.

- [ ] **Step 2: Write failing Doctor tests**

Create fixture Skill trees with frontmatter names and versions. Test compatible, missing, incompatible, conflicting managed guidance, ignored `.gear/`, unignored runtime, and stray artifact cases. Snapshot the consumer directory before and after Doctor and assert deep equality.

- [ ] **Step 3: Verify failures**

Run: `node --test tests/artifacts.test.mjs tests/doctor.test.mjs`  
Expected: FAIL with missing modules.

- [ ] **Step 4: Implement artifact checks**

Each check has `{ id, level: "pass"|"warn"|"error", message, path? }`. Standard requires `task.json`, `brief.md`, `plan.md`, and `summary.md`; Full additionally requires `design.md`; Quick has no task validation.

- [ ] **Step 5: Implement Skill discovery**

Recursively inspect only supplied roots for `SKILL.md`. Parse the first YAML-like frontmatter block for `name` and optional `version`; do not execute Skill content. Return source paths and evidence. Search roots are explicit CLI arguments plus common user/repo Skill roots; missing roots are ignored.

- [ ] **Step 6: Implement Doctor aggregation**

Check plugin version, compatibility evidence, managed blocks, `.gear/` structure, nested ignore rules, root exclusion, stray artifacts, and five routing-fixture requirements. Return a summary count and never call write functions.

- [ ] **Step 7: Add CLI commands and run tests**

Run:

```bash
node --test tests/artifacts.test.mjs tests/doctor.test.mjs
node scripts/gear.mjs doctor --root . --json
```

Expected: tests PASS; local Doctor reports the implementation repository truthfully without mutation.

- [ ] **Step 8: Commit diagnostics**

```bash
git add scripts/lib/artifacts.mjs scripts/lib/skills.mjs scripts/lib/doctor.mjs scripts/gear.mjs tests
git commit -m "feat: validate Gearshift installations"
```

---

### Task 6: Author and validate Gearshift Skills

**Files:**
- Create: `skills/using-gearshift/SKILL.md`
- Create: `skills/complexity-router/SKILL.md`
- Create: `skills/artifact-contract/SKILL.md`
- Create: `skills/init/SKILL.md`
- Create: `skills/quick/SKILL.md`
- Create: `skills/standard/SKILL.md`
- Create: `skills/full/SKILL.md`
- Create: `skills/continue/SKILL.md`
- Create: `skills/doctor/SKILL.md`
- Create: `tests/skills.test.mjs`

**Interfaces:**
- Consumes: Tasks 3–5 CLI and artifact contracts.
- Produces: implicitly discoverable Router plus explicit gear workflows.

- [ ] **Step 1: Invoke the required Skill-authoring discipline**

Before editing Skill content, read and follow `superpowers:writing-skills` and the platform `skill-creator` validation rules. Record no copied third-party prompt text.

- [ ] **Step 2: Write failing structural and policy tests**

Parse all Skill frontmatter. Assert unique kebab-case names, nonempty descriptions, required trigger phrases, Router precedence text, explicit gear override text, Standard no-mandatory-TDD text, Full canonical path override, Doctor read-only text, and absence of deprecated project names/command prefixes.

- [ ] **Step 3: Verify failure**

Run: `node --test tests/skills.test.mjs`  
Expected: FAIL because the Skill directories do not exist.

- [ ] **Step 4: Write bootstrap, Router, and artifact Skills**

`using-gearshift` must trigger for every coding change when Gearshift is installed, require explicit Skill selection to win, and require routing before other workflow frameworks.

`complexity-router` must define the approved signals, output `Gear: <Quick|Standard|Full> — <one sentence>`, continue without confirmation for automatic classification, and implement upgrade rules.

`artifact-contract` must list exact `.gear/` paths, required documents, allowed content, and post-delegation validation.

- [ ] **Step 5: Write command/workflow Skills**

- `init` runs the bundled init CLI, shows the report, asks before dependency installation, then runs Doctor.
- `quick` inspects, edits, proportionately verifies, and creates no task directory unless upgraded.
- `standard` creates a Standard task, invokes `grill-me` or `grill-with-docs`, writes canonical artifacts, implements without mandatory TDD, verifies existing checks, asks about new tests, and writes `summary.md`.
- `full` creates a Full task, supplies canonical paths, then invokes Superpowers brainstorming, planning, worktree, TDD, execution/review, verification, and branch finish.
- `continue` runs continuation evidence, presents choice only when required, and never repeats completed phases.
- `doctor` runs diagnostics and does not repair automatically.

- [ ] **Step 6: Validate Skills**

Run:

```bash
node --test tests/skills.test.mjs
for skill in skills/*; do
  python3 /Users/bowlofnoodles/.codex/skills/.system/skill-creator/scripts/quick_validate.py "$skill"
done
```

Expected: all tests and validations PASS.

- [ ] **Step 7: Commit Skills**

```bash
git add skills tests/skills.test.mjs
git commit -m "feat: add complexity-aware Gearshift workflows"
```

---

### Task 7: Add platform adapters and command parity

**Files:**
- Create: `commands/gear/init.md`
- Create: `commands/gear/quick.md`
- Create: `commands/gear/standard.md`
- Create: `commands/gear/full.md`
- Create: `commands/gear/continue.md`
- Create: `commands/gear/doctor.md`
- Create: `hooks/hooks.json`
- Create: `hooks/session-start.mjs`
- Create: `tests/platforms.test.mjs`
- Modify: `.claude-plugin/plugin.json`
- Modify: `tests/manifests.test.mjs`

**Interfaces:**
- Produces: Claude `/gear:*` commands and documented Codex `$gearshift:*` Skill invocation.

- [ ] **Step 1: Write failing parity tests**

Define the six logical commands once in the test. Assert each has a matching `skills/<action>/SKILL.md` and `commands/gear/<action>.md`. Assert every Claude command delegates to exactly one matching Skill and contains no duplicate workflow policy. Assert the documented Codex entry is `$gearshift:<action>`, never `$gearshift:gear-<action>`. Assert the hook registers only `SessionStart` for `startup|resume|clear|compact` and points to the bundled Node script through `$PLUGIN_ROOT` with a `$CLAUDE_PLUGIN_ROOT` compatibility fallback.

- [ ] **Step 2: Verify failure**

Run: `node --test tests/platforms.test.mjs`  
Expected: FAIL because `commands/gear/init.md` is absent.

- [ ] **Step 3: Create thin Claude adapters**

Each file contains a description and a single instruction to run the matching Gearshift Skill with the user's remaining arguments. Do not duplicate Router or artifact rules in commands.

- [ ] **Step 4: Record platform syntax in manifest starter prompts**

Codex starter prompts use explicit Skill names and natural language. Claude starter examples use `/gear:*`. Do not create deprecated `~/.codex/prompts` files.

- [ ] **Step 5: Add the compact startup hook**

Register a command `SessionStart` hook. `session-start.mjs` reads hook JSON from stdin, checks whether `<cwd>/.gear/config.yaml` exists, and prints JSON containing `hookSpecificOutput.additionalContext`. For initialized repositories the context states that all coding changes enter Gearshift first, explicit selection wins, and Superpowers is only a Full engine. For uninitialized repositories it states that Gearshift is installed and `$gearshift:init` or `/gear:init` initializes the current repository. It must not write files or classify a task. Document that Codex users review and trust plugin hooks through `/hooks`.

- [ ] **Step 6: Run parity and manifest tests**

Run: `node --test tests/platforms.test.mjs tests/manifests.test.mjs`  
Expected: PASS.

- [ ] **Step 7: Commit platform adapters**

```bash
git add commands hooks .claude-plugin .codex-plugin tests/platforms.test.mjs tests/manifests.test.mjs
git commit -m "feat: add Codex and Claude entry points"
```

---

### Task 8: Add behavioral routing evaluations

**Files:**
- Create: `tests/router-cases.json`
- Create: `scripts/eval-router.mjs`
- Create: `tests/router.test.mjs`

**Interfaces:**
- Produces: deterministic policy-fixture validation and an optional live-agent eval command.

- [ ] **Step 1: Write the routing corpus**

Include at least 24 cases across UI text/style, localized config, bounded features, bugs with unclear behavior, new domain rules, public API changes, database migrations, module extraction, explicit overrides, and mid-task upgrades. Each case records request, expected gear, explicit flag, and expected reason signals.

- [ ] **Step 2: Write failing corpus tests**

Assert the five acceptance examples, balanced coverage of all gears, explicit Quick conflict handling, explicit Full no-downgrade behavior, and no use of “risk level” terminology.

- [ ] **Step 3: Implement the eval runner**

The default runner statically validates corpus completeness and prints JSONL prompts suitable for Codex or Claude evaluation. A `--results <jsonl>` mode scores externally captured responses for gear accuracy, explanation presence, and prohibited workflow starts.

- [ ] **Step 4: Run tests**

Run: `node --test tests/router.test.mjs`  
Expected: PASS with at least 24 valid cases.

- [ ] **Step 5: Commit evaluations**

```bash
git add tests/router-cases.json tests/router.test.mjs scripts/eval-router.mjs
git commit -m "test: add Gearshift routing evaluations"
```

---

### Task 9: Create branding and bilingual open-source documentation

**Files:**
- Create: `assets/logo.svg`
- Create: `assets/icon.svg`
- Create: `README.md`
- Create: `README.zh-CN.md`
- Create: `CONTRIBUTING.md`
- Create: `CHANGELOG.md`
- Create: `LICENSE`
- Create: `tests/docs.test.mjs`
- Modify: `.codex-plugin/plugin.json`
- Modify: `tests/manifests.test.mjs`

**Interfaces:**
- Produces: public project identity, accurate installation/usage guidance, and contributor onboarding.

- [ ] **Step 1: Write failing documentation tests**

Assert both READMEs link to each other; include motivation, all gears, natural and explicit use, platform syntax table, install/init, commands, `.gear/`, dependencies, continuation, Doctor, troubleshooting, and license; contain valid relative image links; and contain no fake badge endpoints or unsupported `/gear:*` claim for Codex.

- [ ] **Step 2: Verify failure**

Run: `node --test tests/docs.test.mjs`  
Expected: FAIL because `README.md` is absent.

- [ ] **Step 3: Create SVG identity**

Build accessible, hand-authored SVGs with a gear plus a three-position shift motif. Include `<title>Gearshift</title>`, viewBox, no embedded raster data, and colors that remain legible on light and dark GitHub themes.

Add `composerIcon: "./assets/icon.svg"` and `logo: "./assets/logo.svg"` to the Codex manifest only after the assets exist. Extend manifest tests to assert both paths resolve.

- [ ] **Step 4: Write the English README**

Use a centered hero and this tagline: “The right development process for the task at hand.” Tell the concrete origin story: Superpowers reliably solves difficult agent-coding failures, but a button-color change should not pay for brainstorming, a design spec, detailed planning, worktrees, TDD, and reviews. Explain that Gearshift scales the process rather than replacing Superpowers.

Add only real License and repository-state badges initially. Include Quick/Standard/Full table and diagram, 30-second quickstart, Codex/Claude syntax differences, natural-language examples, canonical artifacts, dependency relationship, FAQ, and troubleshooting.

- [ ] **Step 5: Write the complete Chinese README**

Translate all user-facing content faithfully rather than shortening sections. Preserve commands, code, filenames, links, and product names. Link back to English at the top.

- [ ] **Step 6: Add community files**

Use the standard MIT license with copyright year 2026 and holder `bowlofnoodles`. `CONTRIBUTING.md` documents Node 18+, test commands, Skill validation, routing corpus changes, and no vendoring. `CHANGELOG.md` begins with `0.1.0 - Unreleased` and lists the MVP scope.

- [ ] **Step 7: Run docs tests and inspect rendering**

Run:

```bash
node --test tests/docs.test.mjs
git diff --check
```

Expected: PASS and no whitespace errors. Open both README previews in the Codex app or GitHub-compatible renderer and verify logo sizing, tables, diagrams, language links, and code blocks.

- [ ] **Step 8: Commit presentation**

```bash
git add assets README.md README.zh-CN.md CONTRIBUTING.md CHANGELOG.md LICENSE tests/docs.test.mjs
git commit -m "docs: introduce Gearshift"
```

---

### Task 10: Run end-to-end acceptance and prepare the initial release

**Files:**
- Create: `tests/e2e.test.mjs`
- Create: `.github/workflows/ci.yml`
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: all previous tasks.
- Produces: reproducible CI and verified `0.1.0` release candidate.

- [ ] **Step 1: Write failing end-to-end tests**

In temporary consumer repositories, run init twice, create Standard and Full tasks, transition and continue them, validate artifacts, run Doctor before/after introducing fixture failures, and assert Doctor never mutates the tree. Add a coexistence fixture containing mock Gearshift, Superpowers, grill-me, and grill-with-docs metadata.

- [ ] **Step 2: Run e2e tests before final wiring**

Run: `node --test tests/e2e.test.mjs`  
Expected: FAIL on any missing CLI wiring or compatibility evidence.

- [ ] **Step 3: Fix only acceptance gaps**

Make the smallest changes required for all designed flows. Do not add `/gear:update`, telemetry, new platforms, journals, hosted services, or dependency auto-upgrades.

- [ ] **Step 4: Add CI**

Create a GitHub Actions workflow for pushes and pull requests using Ubuntu, macOS, and Windows; Node 18 and 22; `npm test`; `npm run validate`; and `git diff --check`. The repository tests validate the public manifest schema in CI; the environment-bundled plugin-creator validator remains an additional local release check.

- [ ] **Step 5: Run the complete local verification suite**

Run:

```bash
npm test
npm run validate
python3 /Users/bowlofnoodles/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py .
git diff --check
node scripts/gear.mjs doctor --root . --json
```

Expected: all tests and validators PASS; Doctor has no unexpected errors.

- [ ] **Step 6: Perform manual agent acceptance**

In fresh Codex and Claude Code sessions with all dependencies installed, evaluate at least:

```text
Change the primary button from gray to blue.
Add batch refunds and help me decide partial-failure behavior.
Extract the payment module into an independent service with a data migration.
```

Expected: Quick, Standard, and Full respectively; no Superpowers brainstorming in Quick/Standard; all Standard/Full artifacts under `.gear/`.

- [ ] **Step 7: Mark the changelog release and enable truthful CI badges**

Change `0.1.0 - Unreleased` to `0.1.0 - 2026-07-11` only after verification. Add CI badges only after the workflow exists and its real badge URL is known.

- [ ] **Step 8: Commit release candidate**

```bash
git add tests/e2e.test.mjs .github/workflows/ci.yml README.md README.zh-CN.md CHANGELOG.md
git commit -m "chore: prepare Gearshift 0.1.0"
```

- [ ] **Step 9: Final branch completion**

Invoke `superpowers:verification-before-completion`, then `superpowers:requesting-code-review`, then `superpowers:finishing-a-development-branch`. Do not push or create a release until the user selects that completion option.
