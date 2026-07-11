import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const actions = ["init", "quick", "standard", "full", "continue", "doctor"];

function runHook(input) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["hooks/session-start.mjs"]);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(stdout) : reject(new Error(stderr)));
    child.stdin.end(JSON.stringify(input));
  });
}

test("Claude commands are thin one-to-one Gearshift Skill adapters", async () => {
  for (const action of actions) {
    await readFile(`skills/${action}/SKILL.md`, "utf8");
    const command = await readFile(`commands/gear/${action}.md`, "utf8");
    assert.match(command, new RegExp(`gearshift:${action}`));
    assert.equal((command.match(/gearshift:[a-z-]+/g) ?? []).length, 1);
    assert.match(command, /\$ARGUMENTS/);
    assert.ok(command.split(/\s+/).length < 60, `${action} stays a thin adapter`);
    assert.equal(`$gearshift:${action}`.includes("$gearshift:gear-"), false);
  }
});

test("platform manifests expose native invocation syntax", async () => {
  const codex = JSON.parse(await readFile(".codex-plugin/plugin.json", "utf8"));
  const claude = JSON.parse(await readFile(".claude-plugin/plugin.json", "utf8"));
  assert.ok(codex.interface.defaultPrompt.some((prompt) => /\$gearshift:(init|quick|standard|full|continue|doctor)/.test(prompt)));
  assert.ok(claude.starterPrompts.some((prompt) => /\/gear:(init|quick|standard|full|continue|doctor)/.test(prompt)));
  assert.equal(claude.commands, "./commands/");
  assert.equal(claude.hooks, "./hooks/hooks.json");
});

test("SessionStart hook registers the bundled script for all startup reasons", async () => {
  const manifest = JSON.parse(await readFile("hooks/hooks.json", "utf8"));
  assert.deepEqual(Object.keys(manifest.hooks), ["SessionStart"]);
  const registrations = manifest.hooks.SessionStart;
  assert.equal(registrations.length, 1);
  assert.equal(registrations[0].matcher, "startup|resume|clear|compact");
  assert.equal(registrations[0].hooks.length, 1);
  const command = registrations[0].hooks[0];
  assert.equal(command.type, "command");
  assert.match(command.command, /\$\{PLUGIN_ROOT/);
  assert.match(command.command, /CLAUDE_PLUGIN_ROOT/);
  assert.match(command.command, /hooks\/session-start\.mjs/);
});

test("SessionStart emits compact initialized and uninitialized context without mutation", async () => {
  const root = await mkdtemp(join(tmpdir(), "gearshift-hook-"));
  const before = await readdir(root);
  const uninitializedJson = JSON.parse(await runHook({ cwd: root, source: "startup" }));
  assert.match(uninitializedJson.hookSpecificOutput.additionalContext, /\$gearshift:init/);
  assert.match(uninitializedJson.hookSpecificOutput.additionalContext, /\/gear:init/);
  assert.deepEqual(await readdir(root), before);

  await mkdir(join(root, ".gear"));
  await writeFile(join(root, ".gear/config.yaml"), "version: 1\n");
  const context = JSON.parse(await runHook({ cwd: root, source: "resume" })).hookSpecificOutput.additionalContext;
  assert.match(context, /all coding changes.*Gearshift first/i);
  assert.match(context, /explicit selection wins/i);
  assert.match(context, /Superpowers.*Full engine/i);
});
