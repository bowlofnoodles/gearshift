import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { buildPrompts, scoreResults, validateCorpus } from "../scripts/eval-router.mjs";

const cases = JSON.parse(await readFile("tests/router-cases.json", "utf8"));

test("routing corpus is complete, balanced, and uses complexity language", () => {
  const report = validateCorpus(cases);
  assert.deepEqual(report.errors, []);
  assert.ok(cases.length >= 24);
  const counts = Object.fromEntries(["Quick", "Standard", "Full"].map((gear) => [
    gear,
    cases.filter((item) => item.expectedGear === gear).length,
  ]));
  assert.ok(Math.max(...Object.values(counts)) - Math.min(...Object.values(counts)) <= 1);
  assert.doesNotMatch(JSON.stringify(cases), /risk level/i);
});

test("corpus includes all acceptance examples and override behavior", () => {
  for (const id of [
    "quick-button-color",
    "standard-batch-refunds",
    "full-payment-extraction",
    "quick-explicit-conflict",
    "full-explicit-no-downgrade",
  ]) assert.ok(cases.some((item) => item.id === id), `contains ${id}`);

  const quickConflict = cases.find((item) => item.id === "quick-explicit-conflict");
  assert.equal(quickConflict.expectedAction, "pause-upgrade");
  assert.equal(quickConflict.explicitGear, "Quick");
  const fullOverride = cases.find((item) => item.id === "full-explicit-no-downgrade");
  assert.equal(fullOverride.expectedGear, "Full");
  assert.ok(fullOverride.reasonSignals.includes("no downgrade"));
});

test("default eval output creates one platform-neutral prompt per case", () => {
  const prompts = buildPrompts(cases);
  assert.equal(prompts.length, cases.length);
  assert.deepEqual(prompts.map((item) => item.caseId), cases.map((item) => item.id));
  for (const item of prompts) {
    assert.match(item.prompt, /Gear: <Quick\|Standard\|Full> — <one sentence>/);
    assert.match(item.prompt, /Do not begin implementation workflow before the verdict/);
  }
});

test("result scoring measures gear, explanation, and prohibited workflow starts", async () => {
  const root = await mkdtemp(join(tmpdir(), "gearshift-router-results-"));
  const path = join(root, "results.jsonl");
  await writeFile(path, [
    JSON.stringify({ caseId: "quick-button-color", response: "Gear: Quick — The change is clear and localized." }),
    JSON.stringify({ caseId: "standard-batch-refunds", response: "I'll start Superpowers brainstorming.\nGear: Full — It has failures." }),
  ].join("\n") + "\n");
  const report = await scoreResults(cases, path);
  assert.equal(report.total, 2);
  assert.equal(report.gearCorrect, 1);
  assert.equal(report.explanationPresent, 2);
  assert.equal(report.prohibitedWorkflowStarts, 1);
  assert.equal(report.results[0].passed, true);
  assert.equal(report.results[1].passed, false);
});
