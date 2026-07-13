import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const load = async (path) => JSON.parse(await readFile(path, "utf8"));

test("Codex manifest exposes the Gearshift skills", async () => {
  const manifest = await load(".codex-plugin/plugin.json");
  assert.equal(manifest.name, "gearshift");
  assert.equal(manifest.version, "0.1.1");
  assert.equal(manifest.license, "MIT");
  assert.equal(manifest.skills, "./skills/");
  assert.deepEqual(manifest.interface.capabilities, ["Read", "Write"]);
});

test("repository is a self-contained Claude Code marketplace", async () => {
  const marketplace = await load(".claude-plugin/marketplace.json");

  assert.equal(marketplace.name, "gearshift");
  assert.deepEqual(marketplace.owner, { name: "bowlofnoodles" });
  assert.deepEqual(marketplace.plugins, [
    {
      name: "gearshift",
      source: "./",
      description: "Selects a development workflow that matches the complexity of each coding task.",
      version: "0.1.1",
      author: { name: "bowlofnoodles" },
    },
  ]);
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

test("release metadata uses one Gearshift version", async () => {
  const [codex, claude, compatibility, packageInfo] = await Promise.all([
    load(".codex-plugin/plugin.json"),
    load(".claude-plugin/plugin.json"),
    load("compatibility.json"),
    load("package.json"),
  ]);
  assert.deepEqual(
    [codex.version, claude.version, compatibility.gearshift, packageInfo.version],
    ["0.1.1", "0.1.1", "0.1.1", "0.1.1"],
  );
});

test("compatibility declares Complex dependencies", async () => {
  const compatibility = await load("compatibility.json");
  assert.equal("superpowers" in compatibility.dependencies, false);
  assert.deepEqual(
    compatibility.dependencies["mattpocock-skills"].requiredFor,
    ["complex"],
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
