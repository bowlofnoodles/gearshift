import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { runDoctor } from "../scripts/lib/doctor.mjs";
import { discoverSkills } from "../scripts/lib/skills.mjs";

const execFileAsync = promisify(execFile);
const temp = (prefix) => mkdtemp(join(tmpdir(), prefix));

async function cli(...args) {
  const { stdout } = await execFileAsync(process.execPath, ["scripts/gear.mjs", ...args]);
  return JSON.parse(stdout);
}

async function addSkill(root, folder, name, version) {
  const directory = join(root, folder);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "SKILL.md"), `---\nname: ${name}\nversion: ${version}\ndescription: fixture\n---\n`);
}

async function snapshot(root) {
  async function walk(directory) {
    const result = {};
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(directory, entry.name);
      result[entry.name] = entry.isDirectory() ? await walk(path) : await readFile(path, "utf8");
    }
    return result;
  }
  return walk(root);
}

test("consumer repository completes initialization and Doctor flows without constraining external notes", async () => {
  const root = await temp("gearshift-e2e-");
  const skills = await temp("gearshift-e2e-skills-");
  await addSkill(skills, "gearshift", "using-gearshift", "0.1.0");
  await addSkill(skills, "grill", "grill-me", "1.1.0");
  await addSkill(skills, "grill-docs", "grill-with-docs", "1.1.0");

  const evidence = await discoverSkills([skills]);
  assert.deepEqual(evidence.map((item) => item.name), ["grill-me", "grill-with-docs", "using-gearshift"]);

  const firstInit = await cli("init", "--root", root, "--json");
  const secondInit = await cli("init", "--root", root, "--json");
  assert.equal(firstInit.errors.length, 0);
  assert.equal(secondInit.errors.length, 0);
  assert.ok(secondInit.preserved.includes("AGENTS.md"));

  const healthy = await runDoctor({ root, skillRoots: [skills] });
  assert.equal(healthy.summary.error, 0);
  await mkdir(join(root, "docs/superpowers/specs"), { recursive: true });
  await writeFile(join(root, "docs/superpowers/specs/design.md"), "external notes are allowed\n");
  const beforeDoctor = await snapshot(root);
  const stillHealthy = await runDoctor({ root, skillRoots: [skills] });
  assert.equal(stillHealthy.summary.error, 0);
  assert.deepEqual(await snapshot(root), beforeDoctor);
});
