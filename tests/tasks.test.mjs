import assert from "node:assert/strict";
import { access, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  continuationDecision,
  createTask,
  listIncompleteTasks,
  readTask,
  setCurrentTask,
  transitionTask,
} from "../scripts/lib/tasks.mjs";

const root = () => mkdtemp(join(tmpdir(), "gearshift-task-"));
const exists = async (path) => access(path, constants.F_OK).then(() => true, () => false);

test("creates Standard and Full tasks with gear-specific artifacts", async () => {
  const repo = await root();
  const standard = await createTask({
    root: repo,
    title: "Batch Refunds",
    complexity: "standard",
    now: new Date("2026-07-11T02:00:00.000Z"),
  });
  assert.equal(standard.id, "2026-07-11-batch-refunds");
  assert.equal(standard.status, "planning");
  assert.ok(await exists(join(repo, ".gear/tasks", standard.id, "brief.md")));
  assert.ok(await exists(join(repo, ".gear/tasks", standard.id, "plan.md")));
  assert.equal(await exists(join(repo, ".gear/tasks", standard.id, "design.md")), false);

  const full = await createTask({
    root: repo,
    title: "Payment Service Migration",
    complexity: "full",
    now: new Date("2026-07-12T02:00:00.000Z"),
  });
  assert.ok(await exists(join(repo, ".gear/tasks", full.id, "design.md")));
  await assert.rejects(
    createTask({ root: repo, title: "Batch Refunds", complexity: "standard", now: new Date("2026-07-11") }),
    /already exists/i,
  );
});

test("stores required task record fields and follows valid state transitions", async () => {
  const repo = await root();
  const task = await createTask({ root: repo, title: "Login", complexity: "standard", now: new Date("2026-07-11") });
  assert.deepEqual(Object.keys(task), [
    "schemaVersion", "id", "title", "complexity", "status", "phase", "createdAt", "updatedAt", "artifacts", "engines", "history",
  ]);

  for (const status of ["ready", "implementing", "verifying", "completed"]) {
    await transitionTask({ root: repo, id: task.id, to: status, now: new Date("2026-07-11T03:00:00Z") });
  }
  assert.equal((await readTask(repo, task.id)).status, "completed");
  await assert.rejects(
    transitionTask({ root: repo, id: task.id, to: "ready" }),
    /completed.*ready/i,
  );
});

test("supports blocking, resuming, and cancellation", async () => {
  const repo = await root();
  const task = await createTask({ root: repo, title: "Orders", complexity: "full", now: new Date("2026-07-11") });
  await transitionTask({ root: repo, id: task.id, to: "ready" });
  await transitionTask({ root: repo, id: task.id, to: "blocked" });
  assert.equal((await readTask(repo, task.id)).previousStatus, "ready");
  await transitionTask({ root: repo, id: task.id, to: "ready" });
  await transitionTask({ root: repo, id: task.id, to: "cancelled" });
  assert.equal((await readTask(repo, task.id)).status, "cancelled");
});

test("continuation resumes one task, chooses among many, and ignores completed tasks", async () => {
  const repo = await root();
  const first = await createTask({ root: repo, title: "First", complexity: "standard", now: new Date("2026-07-11") });
  assert.equal((await continuationDecision({ root: repo })).action, "resume");
  await createTask({ root: repo, title: "Second", complexity: "full", now: new Date("2026-07-12") });
  assert.equal((await continuationDecision({ root: repo })).action, "choose");
  await transitionTask({ root: repo, id: first.id, to: "cancelled" });
  assert.equal((await listIncompleteTasks(repo)).length, 1);
  const remaining = (await listIncompleteTasks(repo))[0];
  await transitionTask({ root: repo, id: remaining.id, to: "ready" });
  await transitionTask({ root: repo, id: remaining.id, to: "implementing" });
  await transitionTask({ root: repo, id: remaining.id, to: "verifying" });
  await transitionTask({ root: repo, id: remaining.id, to: "completed" });
  await setCurrentTask(repo, null);
  assert.deepEqual(await continuationDecision({ root: repo }), { action: "start" });
});

test("continuation reports stale pointers and artifact-state inconsistencies", async () => {
  const repo = await root();
  const task = await createTask({ root: repo, title: "Repair Me", complexity: "standard", now: new Date("2026-07-11") });
  await setCurrentTask(repo, task.id);
  await writeFile(join(repo, ".gear/tasks", task.id, "summary.md"), "done\n");
  const decision = await continuationDecision({ root: repo, hasImplementationChanges: true });
  assert.equal(decision.action, "repair");
  assert.match(decision.reasons.join("\n"), /planning.*summary|implementation changes/i);

  await transitionTask({ root: repo, id: task.id, to: "ready" });
  await transitionTask({ root: repo, id: task.id, to: "implementing" });
  await transitionTask({ root: repo, id: task.id, to: "verifying" });
  await transitionTask({ root: repo, id: task.id, to: "completed" });
  const stale = await continuationDecision({ root: repo });
  assert.equal(stale.action, "repair");
  assert.match(stale.reasons.join("\n"), /completed.*current/i);
});
