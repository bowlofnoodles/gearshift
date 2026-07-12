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

test("repository is a self-contained Codex marketplace", async () => {
  const marketplace = await load(".agents/plugins/marketplace.json");

  assert.equal(marketplace.name, "gearshift");
  assert.equal(marketplace.interface.displayName, "Gearshift");
  assert.deepEqual(marketplace.plugins, [
    {
      name: "gearshift",
      source: { source: "local", path: "." },
      policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
      category: "Developer Tools",
    },
  ]);
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

test("Codex starter prompts use current native Gearshift commands", async () => {
  const codex = await load(".codex-plugin/plugin.json");
  assert.ok(codex.interface.defaultPrompt.every((prompt) => prompt.includes("$gearshift:")));
});

test("Codex manifest references repository-owned SVG identity", async () => {
  const manifest = await load(".codex-plugin/plugin.json");
  assert.equal(manifest.interface.composerIcon, "./assets/icon.svg");
  assert.equal(manifest.interface.logo, "./assets/logo.svg");
  await Promise.all([manifest.interface.composerIcon, manifest.interface.logo].map((path) => readFile(path)));
});
