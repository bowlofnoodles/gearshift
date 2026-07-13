#!/usr/bin/env node

import { initializeRepository } from "./lib/init.mjs";
import { runDoctor } from "./lib/doctor.mjs";

function parseArguments(argv) {
  const [command, ...rest] = argv;
  let root = process.cwd();
  let json = false;
  const values = {};
  const skillRoots = [];
  const positionals = [];

  for (let index = 0; index < rest.length; index += 1) {
    if (["--root", "--title", "--complexity", "--id", "--to", "--skill-root"].includes(rest[index])) {
      if (!rest[index + 1]) throw new Error(`${rest[index]} requires a value`);
      const key = rest[index].slice(2);
      if (key === "skill-root") skillRoots.push(rest[index + 1]);
      else values[key] = rest[index + 1];
      if (key === "root") root = rest[index + 1];
      index += 1;
    } else if (rest[index] === "--json") {
      json = true;
    } else if (rest[index].startsWith("--")) {
      throw new Error(`Unknown option: ${rest[index]}`);
    } else {
      positionals.push(rest[index]);
    }
  }
  return { command, root, json, values, positionals, skillRoots };
}

function printReport(report) {
  for (const [label, symbol] of [["created", "+"], ["preserved", "="], ["warnings", "!"], ["errors", "x"]]) {
    for (const message of report[label]) console.log(`${symbol} ${label}: ${message}`);
  }
}

async function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }

  let result;
  if (options.command === "init") {
    result = await initializeRepository({ root: options.root });
    if (!options.json) printReport(result);
    if (result.errors.length > 0) process.exitCode = 1;
  } else if (options.command === "doctor") {
    result = await runDoctor({ root: options.root, skillRoots: options.skillRoots });
  } else {
    console.error(`Unknown command: ${[options.command, ...options.positionals].filter(Boolean).join(" ")}`);
    process.exitCode = 2;
    return;
  }

  if (options.command === "doctor" && result.summary.error > 0) {
    process.exitCode = 1;
  }

  if (options.json) console.log(JSON.stringify(result, null, 2));
  else if (options.command !== "init") {
    if (options.command === "doctor") {
      console.log(`Gearshift ${result.version}`);
      for (const check of result.checks) {
        const symbol = check.level === "pass" ? "+" : check.level === "warning" ? "!" : "x";
        console.log(`${symbol} ${check.id}: ${check.message}`);
      }
      console.log(
        `Summary: ${result.summary.pass} passed, ${result.summary.warning} warnings, ${result.summary.error} errors`,
      );
    } else console.log(JSON.stringify(result, null, 2));
  }
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
