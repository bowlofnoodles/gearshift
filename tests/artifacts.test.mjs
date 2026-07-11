import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { validateTaskArtifacts } from "../scripts/lib/artifacts.mjs";

const temp = () => mkdtemp(join(tmpdir(), "gearshift-artifacts-"));

async function write(path, content = "ok\n") {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, content);
}

test("validates required Standard and Full artifacts", async () => {
  const root = await temp();
  const standard = { id: "2026-07-11-standard", complexity: "standard" };
  const dir = join(root, ".gear/tasks", standard.id);
  for (const name of ["task.json", "brief.md", "plan.md", "summary.md"]) await write(join(dir, name));
  assert.equal((await validateTaskArtifacts(root, standard)).filter((c) => c.level === "error").length, 0);

  const full = { id: standard.id, complexity: "full" };
  const missing = await validateTaskArtifacts(root, full);
  assert.ok(missing.some((c) => c.id === "artifact-required" && c.path.endsWith("design.md") && c.level === "error"));
});

test("reports broken relative Markdown links", async () => {
  const root = await temp();
  const task = { id: "2026-07-11-links", complexity: "standard" };
  const dir = join(root, ".gear/tasks", task.id);
  await write(join(dir, "task.json"));
  await write(join(dir, "brief.md"), "[missing](research/missing.md)\n");
  await write(join(dir, "plan.md"));
  await write(join(dir, "summary.md"));

  const checks = await validateTaskArtifacts(root, task);
  assert.ok(checks.some((c) => c.id === "artifact-link" && c.level === "error"));
});

test("reports stray upstream artifact paths without deleting them", async () => {
  const root = await temp();
  const task = { id: "2026-07-11-stray", complexity: "quick" };
  const spec = join(root, "docs/superpowers/specs/old.md");
  const context = join(root, "src/orders/CONTEXT.md");
  await write(spec);
  await write(context);
  const before = await Promise.all([readFile(spec, "utf8"), readFile(context, "utf8")]);

  const checks = await validateTaskArtifacts(root, task);
  assert.ok(checks.some((c) => c.id === "artifact-stray-superpowers"));
  assert.ok(checks.some((c) => c.id === "artifact-stray-context"));
  assert.deepEqual(await Promise.all([readFile(spec, "utf8"), readFile(context, "utf8")]), before);
});
