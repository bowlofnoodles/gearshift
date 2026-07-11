import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const skillNames = [
  "using-gearshift",
  "complexity-router",
  "artifact-contract",
  "init",
  "quick",
  "standard",
  "full",
  "continue",
  "doctor",
];

async function loadSkill(name) {
  const content = await readFile(`skills/${name}/SKILL.md`, "utf8");
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(match, `${name} has YAML frontmatter`);
  const fields = Object.fromEntries(match[1].split("\n").map((line) => {
    const separator = line.indexOf(":");
    return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
  }));
  return { content, fields };
}

test("all Gearshift Skills have discoverable unique metadata", async () => {
  const skills = await Promise.all(skillNames.map(loadSkill));
  const names = skills.map(({ fields }) => fields.name);
  assert.deepEqual(names, skillNames);
  assert.equal(new Set(names).size, names.length);
  for (const { fields } of skills) {
    assert.match(fields.name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.match(fields.description, /^Use when\b/);
    assert.ok(fields.description.length > 20);
  }
});

test("bootstrap and Router establish Gearshift precedence and explicit overrides", async () => {
  const bootstrap = (await loadSkill("using-gearshift")).content;
  const router = (await loadSkill("complexity-router")).content;
  assert.match(bootstrap, /every coding (request|change)/i);
  assert.match(bootstrap, /before (Superpowers|other workflow)/i);
  assert.match(bootstrap, /explicit.*(Quick|Standard|Full).*wins/i);
  assert.match(router, /Gear: <Quick\|Standard\|Full> — <one sentence>/);
  assert.match(router, /without (asking|confirmation)/i);
  assert.match(router, /upgrade/i);
});

test("artifact contract owns canonical shared paths", async () => {
  const content = (await loadSkill("artifact-contract")).content;
  for (const path of [
    ".gear/config.yaml",
    ".gear/index.md",
    ".gear/context/architecture.md",
    ".gear/context/glossary.md",
    ".gear/adr/",
    ".gear/tasks/<task-id>/design.md",
    ".gear/tasks/<task-id>/plan.md",
    ".gear/tasks/<task-id>/summary.md",
  ]) assert.ok(content.includes(path), `artifact contract includes ${path}`);
  assert.match(content, /validate.*after.*delegat/is);
});

test("workflow Skills preserve the approved gear contracts", async () => {
  const init = (await loadSkill("init")).content;
  const quick = (await loadSkill("quick")).content;
  const standard = (await loadSkill("standard")).content;
  const full = (await loadSkill("full")).content;
  const continuation = (await loadSkill("continue")).content;
  const doctor = (await loadSkill("doctor")).content;

  assert.match(init, /ask.*before.*install/is);
  assert.match(init, /doctor/i);
  assert.match(quick, /no task (directory|artifacts)/i);
  assert.match(quick, /proportionate/i);
  assert.match(standard, /grill-me|grill-with-docs/);
  assert.match(standard, /TDD is not mandatory/i);
  assert.match(standard, /ask.*new tests/is);
  assert.match(full, /superpowers:brainstorming/);
  assert.match(full, /\.gear\/tasks\/<task-id>\/(design|plan)\.md/);
  assert.match(continuation, /never repeat.*completed/i);
  assert.match(doctor, /read-only/i);
  assert.match(doctor, /does not repair/i);
});

test("Skills contain no legacy names or deprecated command prefixes", async () => {
  const skills = await Promise.all(skillNames.map(loadSkill));
  const combined = skills.map(({ content }) => content).join("\n");
  assert.doesNotMatch(combined, /pro-superpowers/i);
  assert.doesNotMatch(combined, /flow:init/i);
  assert.doesNotMatch(combined, /gearshift:gear:/i);
});
