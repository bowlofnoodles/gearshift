import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { initializeRepository } from "../scripts/lib/init.mjs";
import { runDoctor } from "../scripts/lib/doctor.mjs";
import { discoverSkills } from "../scripts/lib/skills.mjs";

const temp = () => mkdtemp(join(tmpdir(), "gearshift-doctor-"));
const execFileAsync = promisify(execFile);

async function skill(root, folder, name, version) {
  const dir = join(root, folder);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "SKILL.md"), `---\nname: ${name}\nversion: ${version}\n---\n# ${name}\n`);
}

async function snapshot(root) {
  async function walk(path) {
    const entries = await readdir(path, { withFileTypes: true });
    const result = {};
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const child = join(path, entry.name);
      result[entry.name] = entry.isDirectory() ? await walk(child) : await readFile(child, "utf8");
    }
    return result;
  }
  return walk(root);
}

test("discovers only supplied Skill roots and parses metadata", async () => {
  const root = await temp();
  await skill(root, "superpowers", "superpowers", "6.1.1");
  await skill(root, "matt/grill", "grill-me", "1.1.0");
  const evidence = await discoverSkills([root, join(root, "missing")]);
  assert.deepEqual(evidence.map((item) => item.name), ["grill-me", "superpowers"]);
  assert.equal(evidence.find((item) => item.name === "superpowers").version, "6.1.1");
});

test("Doctor reports compatible dependencies and never mutates the repository", async () => {
  const root = await temp();
  const skills = await temp();
  await initializeRepository({ root, guidanceTargets: ["AGENTS.md"] });
  await skill(skills, "superpowers", "superpowers", "6.1.1");
  await skill(skills, "matt", "grill-me", "1.1.0");
  await skill(skills, "matt-docs", "grill-with-docs", "1.1.0");
  const before = await snapshot(root);
  const report = await runDoctor({ root, skillRoots: [skills] });
  assert.equal(report.checks.filter((c) => c.level === "error").length, 0);
  assert.ok(report.checks.some((c) => c.id === "dependency-superpowers" && c.level === "pass"));
  assert.deepEqual(await snapshot(root), before);
  assert.equal(report.summary.total, report.checks.length);
});

test("Doctor reports missing/incompatible dependencies and repository conflicts", async () => {
  const root = await temp();
  const skills = await temp();
  await initializeRepository({ root, guidanceTargets: ["AGENTS.md"] });
  await skill(skills, "superpowers", "superpowers", "7.0.0");
  await writeFile(join(root, "AGENTS.md"), "<!-- GEARSHIFT:START -->\nconflict\n<!-- GEARSHIFT:END -->\n");
  await writeFile(join(root, ".gitignore"), "/.gear/\n");
  await writeFile(join(root, ".gear/.gitignore"), "*.tmp\n");
  await mkdir(join(root, "docs/superpowers/specs"), { recursive: true });
  await writeFile(join(root, "docs/superpowers/specs/design.md"), "stray\n");

  const report = await runDoctor({ root, skillRoots: [skills] });
  const ids = new Set(report.checks.filter((c) => c.level === "error").map((c) => c.id));
  assert.ok(ids.has("dependency-superpowers"));
  assert.ok(ids.has("dependency-mattpocock-skills"));
  assert.ok(ids.has("guidance-managed"));
  assert.ok(ids.has("git-root-ignore"));
  assert.ok(ids.has("git-runtime-ignore"));
  assert.ok(ids.has("artifact-stray-superpowers"));
});

test("Doctor CLI prints a readable report", async () => {
  const root = await temp();
  const skills = await temp();
  await initializeRepository({ root, guidanceTargets: ["AGENTS.md"] });
  await skill(skills, "superpowers", "superpowers", "6.1.1");
  await skill(skills, "matt", "grill-me", "1.1.0");
  await skill(skills, "matt-docs", "grill-with-docs", "1.1.0");

  const { stdout } = await execFileAsync(process.execPath, [
    "scripts/gear.mjs",
    "doctor",
    "--root",
    root,
    "--skill-root",
    skills,
  ]);
  assert.match(stdout, /^Gearshift 0\.1\.0/m);
  assert.match(stdout, /Summary: \d+ passed, 0 warnings, 0 errors/);
  assert.doesNotMatch(stdout, /undefined/);
});
