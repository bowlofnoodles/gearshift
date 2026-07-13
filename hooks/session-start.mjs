#!/usr/bin/env node

import { readFile } from "node:fs/promises";
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
const initialized = await Promise.all(["AGENTS.md", "CLAUDE.md"].map((file) => readFile(join(cwd, file), "utf8").catch(() => "")))
  .then((contents) => contents.some((content) => content.includes("<!-- GEARSHIFT:START -->") && content.includes("<!-- GEARSHIFT:END -->")));
const additionalContext = initialized
  ? "Gearshift is initialized. Route all coding changes through Gearshift first; explicit selection wins. Use Quick and Complex modes."
  : "Gearshift is installed but this repository is not initialized. Use $gearshift:init in Codex to initialize it.";

process.stdout.write(`${JSON.stringify({
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext,
  },
})}\n`);
