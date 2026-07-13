#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const GEARS = ["Quick", "Complex"];
const ACTIONS = new Set(["route", "upgrade", "pause-upgrade"]);

export function validateCorpus(cases) {
  const errors = [];
  if (!Array.isArray(cases)) return { errors: ["Corpus must be a JSON array"], count: 0 };
  const ids = new Set();
  for (const [index, item] of cases.entries()) {
    const label = item?.id ?? `case ${index + 1}`;
    if (!item || typeof item !== "object") {
      errors.push(`${label}: case must be an object`);
      continue;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id ?? "")) errors.push(`${label}: invalid id`);
    if (ids.has(item.id)) errors.push(`${label}: duplicate id`);
    ids.add(item.id);
    if (typeof item.request !== "string" || !item.request.trim()) errors.push(`${label}: request is required`);
    if (!GEARS.includes(item.expectedGear)) errors.push(`${label}: expectedGear must be Quick or Complex`);
    if (typeof item.explicit !== "boolean") errors.push(`${label}: explicit must be boolean`);
    if (item.explicit && !GEARS.includes(item.explicitGear)) errors.push(`${label}: explicitGear is required for explicit cases`);
    if (!ACTIONS.has(item.expectedAction)) errors.push(`${label}: invalid expectedAction`);
    if (!Array.isArray(item.reasonSignals) || item.reasonSignals.length === 0) errors.push(`${label}: reasonSignals are required`);
  }
  if (cases.length < 6) errors.push("Corpus must contain at least 6 cases");
  if (/risk level/i.test(JSON.stringify(cases))) errors.push("Corpus must use complexity terminology");
  const counts = GEARS.map((gear) => cases.filter((item) => item.expectedGear === gear).length);
  if (Math.max(...counts) - Math.min(...counts) > 1) errors.push("Gear coverage must be balanced");
  return { errors, count: cases.length };
}

export function buildPrompts(cases) {
  return cases.map((item) => ({
    caseId: item.id,
    prompt: [
      `Coding request: ${item.request}`,
      "Apply Gearshift routing. Respond first with Gear: <Quick|Complex> — <one sentence>.",
      "Do not begin implementation workflow before the verdict.",
    ].join("\n"),
  }));
}

function workflowStartedBeforeVerdict(response) {
  const beforeVerdict = response.split(/Gear:\s*(?:Quick|Complex)/i)[0];
  return /(?:start|begin|invoke|run|use|write|create)[^\n.]*(?:brainstorm|superpowers|tdd|test[- ]first|worktree|implementation plan)/i.test(beforeVerdict);
}

export async function scoreResults(cases, resultsPath) {
  const source = await readFile(resultsPath, "utf8");
  const byId = new Map(cases.map((item) => [item.id, item]));
  const captures = source.split(/\r?\n/).filter(Boolean).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`Invalid JSONL at line ${index + 1}: ${error.message}`);
    }
  });
  const results = captures.map((capture) => {
    const fixture = byId.get(capture.caseId);
    if (!fixture) throw new Error(`Unknown caseId: ${capture.caseId}`);
    const response = typeof capture.response === "string" ? capture.response : "";
    const verdict = response.match(/Gear:\s*(Quick|Complex)\s*—\s*([^\n]+)/i);
    const actualGear = verdict ? GEARS.find((gear) => gear.toLowerCase() === verdict[1].toLowerCase()) : null;
    const gearCorrect = actualGear === fixture.expectedGear;
    const explanationPresent = Boolean(verdict?.[2]?.trim());
    const prohibitedWorkflowStart = workflowStartedBeforeVerdict(response);
    return {
      caseId: fixture.id,
      expectedGear: fixture.expectedGear,
      actualGear,
      gearCorrect,
      explanationPresent,
      prohibitedWorkflowStart,
      passed: gearCorrect && explanationPresent && !prohibitedWorkflowStart,
    };
  });
  return {
    total: results.length,
    gearCorrect: results.filter((item) => item.gearCorrect).length,
    explanationPresent: results.filter((item) => item.explanationPresent).length,
    prohibitedWorkflowStarts: results.filter((item) => item.prohibitedWorkflowStart).length,
    passed: results.filter((item) => item.passed).length,
    results,
  };
}

async function main(argv) {
  const corpus = JSON.parse(await readFile("tests/router-cases.json", "utf8"));
  const validation = validateCorpus(corpus);
  if (validation.errors.length > 0) {
    console.error(validation.errors.join("\n"));
    process.exitCode = 1;
    return;
  }
  const resultsIndex = argv.indexOf("--results");
  if (resultsIndex >= 0) {
    if (!argv[resultsIndex + 1]) throw new Error("--results requires a JSONL path");
    console.log(JSON.stringify(await scoreResults(corpus, argv[resultsIndex + 1]), null, 2));
    return;
  }
  for (const prompt of buildPrompts(corpus)) console.log(JSON.stringify(prompt));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.stack ?? error.message);
    process.exitCode = 1;
  });
}
