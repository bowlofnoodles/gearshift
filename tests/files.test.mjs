import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { gearPaths } from "../scripts/lib/paths.mjs";
import {
  mergeLines,
  upsertManagedBlock,
  writeIfMissing,
  writeJsonAtomic,
} from "../scripts/lib/files.mjs";

test("gearPaths returns every canonical repository path", () => {
  const root = resolve("/repo");

  assert.deepEqual(gearPaths("/repo"), {
    root,
    gear: join(root, ".gear"),
    config: join(root, ".gear", "config.yaml"),
    index: join(root, ".gear", "index.md"),
    context: join(root, ".gear", "context"),
    glossary: join(root, ".gear", "context", "glossary.md"),
    architecture: join(root, ".gear", "context", "architecture.md"),
    adr: join(root, ".gear", "adr"),
    tasks: join(root, ".gear", "tasks"),
    runtime: join(root, ".gear", ".runtime"),
    currentTask: join(root, ".gear", ".runtime", "current-task"),
  });
  assert.equal(gearPaths("/repo").tasks, join(resolve("/repo"), ".gear", "tasks"));
});

test("writeIfMissing creates a file but preserves an existing file", async () => {
  const root = await mkdtemp(join(tmpdir(), "gearshift-"));
  const path = join(root, "nested", "notes.md");

  assert.equal(await writeIfMissing(path, "original\n"), "created");
  assert.equal(await writeIfMissing(path, "replacement\n"), "preserved");
  assert.equal(await readFile(path, "utf8"), "original\n");
});

test("writeJsonAtomic replaces JSON with a final newline and removes its temporary file", async () => {
  const root = await mkdtemp(join(tmpdir(), "gearshift-"));
  const path = join(root, "nested", "task.json");
  await writeJsonAtomic(path, { status: "old" });

  await writeJsonAtomic(path, { status: "active", count: 2 });

  assert.equal(
    await readFile(path, "utf8"),
    '{\n  "status": "active",\n  "count": 2\n}\n',
  );
  assert.deepEqual(await readdir(join(root, "nested")), ["task.json"]);
});

test("writeJsonAtomic safely completes concurrent writes without temporary residue", async () => {
  const root = await mkdtemp(join(tmpdir(), "gearshift-"));
  const path = join(root, "task.json");
  const values = Array.from({ length: 20 }, (_, writer) => ({
    writer,
    payload: `writer-${writer}`.repeat(100),
  }));

  await Promise.all(values.map((value) => writeJsonAtomic(path, value)));

  const finalValue = JSON.parse(await readFile(path, "utf8"));
  assert.ok(values.some((value) => JSON.stringify(value) === JSON.stringify(finalValue)));
  assert.deepEqual(await readdir(root), ["task.json"]);
});

test("writeJsonAtomic removes its temporary file when rename fails", async () => {
  const root = await mkdtemp(join(tmpdir(), "gearshift-"));
  const path = join(root, "destination");
  await mkdir(path);

  await assert.rejects(writeJsonAtomic(path, { status: "blocked" }));

  assert.deepEqual(await readdir(root), ["destination"]);
});

test("upsertManagedBlock inserts a managed block without losing user text", () => {
  const result = upsertManagedBlock("# User\n", "GEARSHIFT", "Router first.");

  assert.match(result, /# User/);
  assert.equal(
    result,
    "# User\n\n<!-- GEARSHIFT:START -->\nRouter first.\n<!-- GEARSHIFT:END -->\n",
  );
});

test("upsertManagedBlock replaces only the existing managed block", () => {
  assert.equal(
    upsertManagedBlock(
      "before\n<!-- GEARSHIFT:START -->\nold\n<!-- GEARSHIFT:END -->\nafter\n",
      "GEARSHIFT",
      "new",
    ),
    "before\n<!-- GEARSHIFT:START -->\nnew\n<!-- GEARSHIFT:END -->\nafter\n",
  );
});

test("upsertManagedBlock rejects unmatched managed markers", () => {
  assert.throws(
    () => upsertManagedBlock("<!-- GEARSHIFT:START -->\nold\n", "GEARSHIFT", "new"),
    /unmatched/i,
  );
  assert.throws(
    () => upsertManagedBlock("old\n<!-- GEARSHIFT:END -->\n", "GEARSHIFT", "new"),
    /unmatched/i,
  );
  assert.throws(
    () =>
      upsertManagedBlock(
        "<!-- GEARSHIFT:START -->\n<!-- GEARSHIFT:START -->\nold\n<!-- GEARSHIFT:END -->\n",
        "GEARSHIFT",
        "new",
      ),
    /unmatched/i,
  );
});

test("mergeLines preserves existing rules and appends missing rules once", () => {
  assert.equal(
    mergeLines("/.runtime/\n", ["/.runtime/", "*.tmp", "*.lock"]),
    "/.runtime/\n*.tmp\n*.lock\n",
  );
  assert.equal(
    mergeLines("custom/\n\n*.tmp\ncustom/\n", ["*.tmp", "*.lock", "*.lock"]),
    "custom/\n*.tmp\n*.lock\n",
  );
});
