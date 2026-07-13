import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { initializeRepository } from "../scripts/lib/init.mjs";
import { runDoctor } from "../scripts/lib/doctor.mjs";
import { discoverSkills } from "../scripts/lib/skills.mjs";

const temp = () => mkdtemp(join(tmpdir(), "gearshift-doctor-"));
const execFileAsync = promisify(execFile);
const releaseVersion = JSON.parse(await readFile("package.json", "utf8")).version;

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

test("discovers plugin-cache versions from ancestor directories", async () => {
  const root = await temp();
  const directory = join(root, "publisher/superpowers/6.1.1/skills/using-superpowers");
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "SKILL.md"), "---\nname: using-superpowers\ndescription: fixture\n---\n");
  const evidence = await discoverSkills([root]);
  assert.equal(evidence[0].version, "6.1.1");
});

test("Doctor reports compatible dependencies and never mutates the repository", async () => {
  const root = await temp();
  const skills = await temp();
  await initializeRepository({ root, guidanceTargets: ["AGENTS.md"] });
  await skill(skills, "matt", "grill-me", "1.1.0");
  await skill(skills, "matt-docs", "grill-with-docs", "1.1.0");
  const before = await snapshot(root);
  const report = await runDoctor({ root, skillRoots: [skills] });
  assert.equal(report.checks.filter((c) => c.level === "error").length, 0);
  assert.deepEqual(await snapshot(root), before);
  assert.equal(report.summary.total, report.checks.length);
  assert.equal(report.summary.warning, 0);
  assert.equal("warn" in report.summary, false);
});

test("Doctor warns instead of failing when installed grill Skills omit versions", async () => {
  const root = await temp();
  const skills = await temp();
  await initializeRepository({ root, guidanceTargets: ["AGENTS.md"] });
  for (const [folder, name] of [["grill", "grill-me"], ["grill-docs", "grill-with-docs"]]) {
    const directory = join(skills, folder);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "SKILL.md"), `---\nname: ${name}\ndescription: fixture\n---\n`);
  }
  const report = await runDoctor({ root, skillRoots: [skills] });
  const grills = report.checks.find((item) => item.id === "dependency-mattpocock-skills");
  assert.equal(grills.level, "warning");
  assert.match(grills.message, /installed.*version.*not declared/i);
  assert.equal(report.summary.error, 0);
  assert.equal(report.summary.warning, 1);
});

test("Doctor reports missing/incompatible dependencies and repository conflicts", async () => {
  const root = await temp();
  const skills = await temp();
  await initializeRepository({ root, guidanceTargets: ["AGENTS.md"] });
  await writeFile(join(root, "AGENTS.md"), "<!-- GEARSHIFT:START -->\nconflict\n<!-- GEARSHIFT:END -->\n");

  const report = await runDoctor({ root, skillRoots: [skills] });
  const ids = new Set(report.checks.filter((c) => c.level === "error").map((c) => c.id));
  assert.ok(ids.has("dependency-mattpocock-skills"));
  assert.ok(ids.has("guidance-managed"));
});

test("Doctor CLI prints a readable report", async () => {
  const root = await temp();
  const skills = await temp();
  await initializeRepository({ root, guidanceTargets: ["AGENTS.md"] });
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
  assert.equal(stdout.split("\n", 1)[0], `Gearshift ${releaseVersion}`);
  assert.match(stdout, /Summary: \d+ passed, 0 warnings, 0 errors/);
  assert.doesNotMatch(stdout, /undefined/);
});

test("Doctor CLI returns a failing status for JSON reports with errors", async () => {
  const root = await temp();
  await assert.rejects(
    execFileAsync(process.execPath, ["scripts/gear.mjs", "doctor", "--root", root, "--json"]),
    (error) => {
      assert.equal(error.code, 1);
      assert.ok(JSON.parse(error.stdout).summary.error > 0);
      return true;
    },
  );
});
