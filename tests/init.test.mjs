import assert from "node:assert/strict";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { initializeRepository } from "../scripts/lib/init.mjs";

const MANAGED_BODY = [
  "For every coding change, invoke the Gearshift complexity router before any third-party development workflow.",
  "Explicit gear selection wins.",
  "Do not invoke Superpowers directly unless Gearshift selected Full or the user explicitly requested a specific Superpowers skill.",
  "Read .gear/config.yaml for project-specific classification rules and .gear/index.md for active tasks.",
].join("\n");

async function temporaryRepository() {
  return mkdtemp(join(tmpdir(), "gearshift-init-"));
}

test("initializes an empty repository with canonical shared and ignored files", async () => {
  const root = await temporaryRepository();

  const report = await initializeRepository({
    root,
    guidanceTargets: ["AGENTS.md", "CLAUDE.md"],
  });

  assert.deepEqual(Object.keys(report), ["created", "preserved", "warnings", "errors"]);
  assert.deepEqual(report.errors, []);
  assert.match(await readFile(join(root, ".gear", "config.yaml"), "utf8"), /schema_version: 1/);
  assert.match(await readFile(join(root, ".gear", "config.yaml"), "utf8"), /default_mode: auto/);
  assert.match(await readFile(join(root, ".gear", "index.md"), "utf8"), /## Active[\s\S]*## Completed/);
  assert.equal(
    await readFile(join(root, ".gear", ".gitignore"), "utf8"),
    "/.runtime/\n*.tmp\n*.lock\n",
  );
  assert.match(await readFile(join(root, "AGENTS.md"), "utf8"), new RegExp(MANAGED_BODY.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.ok((await stat(join(root, ".gear", ".runtime"))).isDirectory());
});

test("preserves user files and replaces only the managed guidance block", async () => {
  const root = await temporaryRepository();
  await writeFile(join(root, "AGENTS.md"), "# User rules\n");
  await initializeRepository({ root, guidanceTargets: ["AGENTS.md"] });
  const firstConfig = await readFile(join(root, ".gear", "config.yaml"), "utf8");
  await writeFile(join(root, ".gear", "config.yaml"), `${firstConfig}\n# custom\n`);

  const report = await initializeRepository({ root, guidanceTargets: ["AGENTS.md"] });
  const guidance = await readFile(join(root, "AGENTS.md"), "utf8");

  assert.match(guidance, /^# User rules/m);
  assert.equal((guidance.match(/GEARSHIFT:START/g) ?? []).length, 1);
  assert.match(await readFile(join(root, ".gear", "config.yaml"), "utf8"), /# custom/);
  assert.ok(report.preserved.includes(".gear/config.yaml"));
  assert.deepEqual(report.errors, []);
});

test("reports malformed managed markers without overwriting guidance", async () => {
  const root = await temporaryRepository();
  const malformed = "user\n<!-- GEARSHIFT:START -->\nbroken\n";
  await writeFile(join(root, "AGENTS.md"), malformed);

  const report = await initializeRepository({ root, guidanceTargets: ["AGENTS.md"] });

  assert.equal(await readFile(join(root, "AGENTS.md"), "utf8"), malformed);
  assert.equal(report.errors.length, 1);
  assert.match(report.errors[0], /AGENTS\.md.*unmatched/i);
});

for (const ignored of [".gear", ".gear/", "/.gear", "/.gear/"]) {
  test(`reports root ignore pattern ${ignored} without rewriting it`, async () => {
    const root = await temporaryRepository();
    await writeFile(join(root, ".gitignore"), `${ignored}\ncustom/\n`);

    const report = await initializeRepository({ root, guidanceTargets: [] });

    assert.match(report.errors.join("\n"), /root \.gitignore excludes \.gear/i);
    assert.equal(await readFile(join(root, ".gitignore"), "utf8"), `${ignored}\ncustom/\n`);
  });
}

test("CLI emits JSON for init and exits 2 for unknown commands", async () => {
  const root = await temporaryRepository();
  const init = spawnSync(process.execPath, ["scripts/gear.mjs", "init", "--root", root, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(init.status, 0, init.stderr);
  assert.deepEqual(JSON.parse(init.stdout).errors, []);

  const unknown = spawnSync(process.execPath, ["scripts/gear.mjs", "wat"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /unknown command/i);
});
