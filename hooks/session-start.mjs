#!/usr/bin/env node

import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { join, resolve } from "node:path";

async function readInput() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  if (!input.trim()) return {};
  try {
    return JSON.parse(input);
  } catch {
    return {};
  }
}

const input = await readInput();
const cwd = resolve(typeof input.cwd === "string" ? input.cwd : process.cwd());
const initialized = await access(join(cwd, ".gear", "config.yaml"), constants.F_OK)
  .then(() => true, () => false);
const additionalContext = initialized
  ? "Gearshift is initialized. Route all coding changes through Gearshift first; explicit selection wins. Superpowers is only the Full engine."
  : "Gearshift is installed but this repository is not initialized. Use $gearshift:init in Codex or /gearshift:init in Claude Code to initialize it.";

process.stdout.write(`${JSON.stringify({
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext,
  },
})}\n`);
