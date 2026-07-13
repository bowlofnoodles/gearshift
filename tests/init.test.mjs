import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { initializeRepository } from "../scripts/lib/init.mjs";

const MANAGED_BODY = [
  "For every coding change, invoke the Gearshift complexity router before any third-party development workflow.",
  "Explicit gear selection wins.",
  "Use Gearshift's native Quick and Complex workflows; do not invoke third-party workflows unless the user explicitly requests them.",
  "Use Gearshift's native Quick and Complex workflows; let referenced Skills use their native document behavior.",
].join("\n");

async function temporaryRepository() {
  return mkdtemp(join(tmpdir(), "gearshift-init-"));
}

test("initializes an empty repository with managed guidance only", async () => {
  const root = await temporaryRepository();

  const report = await initializeRepository({
    root,
    guidanceTargets: ["AGENTS.md", "CLAUDE.md"],
  });

  assert.deepEqual(Object.keys(report), ["created", "preserved", "warnings", "errors"]);
  assert.deepEqual(report.errors, []);
  assert.match(await readFile(join(root, "AGENTS.md"), "utf8"), new RegExp(MANAGED_BODY.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.ok(report.created.includes("AGENTS.md"));
  assert.ok(report.created.includes("CLAUDE.md"));
});

test("preserves user files and replaces only the managed guidance block", async () => {
  const root = await temporaryRepository();
  await writeFile(join(root, "AGENTS.md"), "# User rules\n");
  await initializeRepository({ root, guidanceTargets: ["AGENTS.md"] });

  const report = await initializeRepository({ root, guidanceTargets: ["AGENTS.md"] });
  const guidance = await readFile(join(root, "AGENTS.md"), "utf8");

  assert.match(guidance, /^# User rules/m);
  assert.equal((guidance.match(/GEARSHIFT:START/g) ?? []).length, 1);
  assert.ok(report.preserved.includes("AGENTS.md"));
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

test("CLI emits JSON for init and exits 2 for unknown commands", async () => {
  const root = await temporaryRepository();
  const ok = spawnSync(process.execPath, ["scripts/gear.mjs", "init", "--root", root, "--json"], { encoding: "utf8" });
  assert.equal(ok.status, 0);
  assert.equal(JSON.parse(ok.stdout).errors.length, 0);

  const bad = spawnSync(process.execPath, ["scripts/gear.mjs", "unknown", "--root", root], { encoding: "utf8" });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /Unknown command/);
});
