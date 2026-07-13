import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const cases = JSON.parse(await readFile("tests/router-cases.json", "utf8"));

test("routing corpus covers Quick and Complex modes", () => {
  const counts = Object.fromEntries(["Quick", "Complex"].map((gear) => [
    gear,
    cases.filter((item) => item.expectedGear === gear).length,
  ]));
  assert.ok(counts.Quick >= 2);
  assert.ok(counts.Complex >= 3);
});

test("corpus includes acceptance examples and override behavior", () => {
  assert.ok(cases.some((item) => item.id === "quick-button-color"));
  assert.ok(cases.some((item) => item.id === "complex-batch-refunds"));
  assert.ok(cases.some((item) => item.id === "complex-migration"));
  const complexOverride = cases.find((item) => item.id === "complex-explicit-no-downgrade");
  assert.equal(complexOverride.expectedGear, "Complex");
  assert.ok(complexOverride.reasonSignals.includes("no downgrade"));
});

test("default eval output creates one platform-neutral prompt per case", async () => {
  const { buildPrompts } = await import("../scripts/eval-router.mjs");
  const prompts = buildPrompts(cases);
  assert.equal(prompts.length, cases.length);
  for (const item of prompts) {
    assert.match(item.prompt, /Gear: <Quick\|Complex> — <one sentence>/);
    assert.match(item.prompt, /Coding request:/);
  }
});

test("result scoring measures gear, explanation, and prohibited workflow starts", async () => {
  const { scoreResults } = await import("../scripts/eval-router.mjs");
  const lines = [
    JSON.stringify({ caseId: "quick-button-color", response: "Gear: Quick — It is localized." }),
    JSON.stringify({ caseId: "complex-batch-refunds", response: "I'll start brainstorming.\nGear: Complex — It has requirements." }),
  ];
  const dir = await mkdtemp(join(tmpdir(), "gearshift-router-"));
  const path = join(dir, "results.jsonl");
  await writeFile(path, lines.join("\n"));
  const scored = await scoreResults(cases, path);
  assert.equal(scored.total, 2);
  assert.equal(scored.results[0].gearCorrect, true);
  assert.equal(scored.results[1].prohibitedWorkflowStart, true);
});
