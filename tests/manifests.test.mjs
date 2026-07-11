import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const load = async (path) => JSON.parse(await readFile(path, "utf8"));

test("Codex manifest exposes the Gearshift skills", async () => {
  const manifest = await load(".codex-plugin/plugin.json");
  assert.equal(manifest.name, "gearshift");
  assert.equal(manifest.version, "0.1.0");
  assert.equal(manifest.license, "MIT");
  assert.equal(manifest.skills, "./skills/");
  assert.deepEqual(manifest.interface.capabilities, ["Read", "Write"]);
});

test("Claude manifest uses the same identity and version", async () => {
  const codex = await load(".codex-plugin/plugin.json");
  const claude = await load(".claude-plugin/plugin.json");
  assert.equal(claude.name, codex.name);
  assert.equal(claude.version, codex.version);
});

test("compatibility declares optional engines by gear", async () => {
  const compatibility = await load("compatibility.json");
  assert.deepEqual(compatibility.dependencies.superpowers.requiredFor, ["full"]);
  assert.deepEqual(
    compatibility.dependencies["mattpocock-skills"].requiredFor,
    ["standard"],
  );
});

test("starter prompts use current platform-native Gearshift commands", async () => {
  const codex = await load(".codex-plugin/plugin.json");
  const claude = await load(".claude-plugin/plugin.json");
  assert.ok(codex.interface.defaultPrompt.every((prompt) => prompt.includes("$gearshift:")));
  assert.ok(claude.starterPrompts.every((prompt) => prompt.includes("/gear:")));
});
