#!/usr/bin/env node

import { initializeRepository } from "./lib/init.mjs";

function parseArguments(argv) {
  const [command, ...rest] = argv;
  let root = process.cwd();
  let json = false;

  for (let index = 0; index < rest.length; index += 1) {
    if (rest[index] === "--root") {
      if (!rest[index + 1]) throw new Error("--root requires a path");
      root = rest[index + 1];
      index += 1;
    } else if (rest[index] === "--json") {
      json = true;
    } else {
      throw new Error(`Unknown option: ${rest[index]}`);
    }
  }
  return { command, root, json };
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

  if (options.command !== "init") {
    console.error(`Unknown command: ${options.command ?? ""}`);
    process.exitCode = 2;
    return;
  }

  const report = await initializeRepository({ root: options.root });
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else printReport(report);
  if (report.errors.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
