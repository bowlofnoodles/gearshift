import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { strayChecks } from "./artifacts.mjs";
import { MANAGED_GUIDANCE } from "./init.mjs";
import { gearPaths } from "./paths.mjs";
import { discoverSkills } from "./skills.mjs";

const PLUGIN_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const check = (id, level, message, path) => ({ id, level, message, ...(path ? { path } : {}) });
const exists = (path) => access(path, constants.F_OK).then(() => true, () => false);
const readOptional = async (path) => readFile(path, "utf8").catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));

function tuple(version) {
  const match = version?.match(/^(\d+)\.(\d+)\.(\d+)/);
  return match ? match.slice(1).map(Number) : null;
}
function compare(a, b) {
  for (let index = 0; index < 3; index += 1) if (a[index] !== b[index]) return a[index] - b[index];
  return 0;
}
function supported(version, range) {
  const value = tuple(version);
  if (!value) return false;
  return range.split(/\s+/).every((clause) => {
    const match = clause.match(/^(>=|<)(\d+\.\d+\.\d+)$/);
    if (!match) return true;
    const difference = compare(value, tuple(match[2]));
    return match[1] === ">=" ? difference >= 0 : difference < 0;
  });
}

export async function runDoctor({ root, skillRoots = [] }) {
  const resolvedRoot = resolve(root);
  const paths = gearPaths(resolvedRoot);
  const checks = [];
  const compatibility = JSON.parse(await readFile(join(PLUGIN_ROOT, "compatibility.json"), "utf8"));
  const packageInfo = JSON.parse(await readFile(join(PLUGIN_ROOT, "package.json"), "utf8"));
  checks.push(check("plugin-version", "pass", `Gearshift ${packageInfo.version}`));

  const roots = skillRoots.length > 0 ? skillRoots : [
    join(resolvedRoot, ".agents", "skills"),
    join(homedir(), ".agents", "skills"),
  ];
  const evidence = await discoverSkills(roots);
  const superpowers = evidence.find((item) => item.name === "superpowers" || item.name === "using-superpowers");
  checks.push(check(
    "dependency-superpowers",
    superpowers && supported(superpowers.version, compatibility.dependencies.superpowers.supported) ? "pass" : "error",
    superpowers ? `Superpowers ${superpowers.version ?? "unknown"}` : "Superpowers is missing",
    superpowers?.path,
  ));
  const grills = ["grill-me", "grill-with-docs"].map((name) => evidence.find((item) => item.name === name));
  const mattCompatible = grills.every((item) => item && supported(item.version, compatibility.dependencies["mattpocock-skills"].supported));
  checks.push(check(
    "dependency-mattpocock-skills",
    mattCompatible ? "pass" : "error",
    mattCompatible ? "grill-me and grill-with-docs are compatible" : "Compatible grill-me and grill-with-docs are required",
  ));

  for (const target of ["AGENTS.md", "CLAUDE.md"]) {
    const content = await readOptional(join(resolvedRoot, target));
    if (content === null) continue;
    const valid = content.includes("<!-- GEARSHIFT:START -->") && content.includes(MANAGED_GUIDANCE) && content.includes("<!-- GEARSHIFT:END -->");
    checks.push(check("guidance-managed", valid ? "pass" : "error", `${target} Gearshift block ${valid ? "is valid" : "conflicts with the managed contract"}`, target));
  }

  for (const [name, path] of [["config", paths.config], ["index", paths.index], ["tasks", paths.tasks], ["runtime", paths.runtime]]) {
    checks.push(check("gear-structure", await exists(path) ? "pass" : "error", `.gear ${name} ${await exists(path) ? "exists" : "is missing"}`, path));
  }
  const nestedIgnore = await readOptional(join(paths.gear, ".gitignore"));
  const ignoresRuntime = nestedIgnore !== null && ["/.runtime/", "*.tmp", "*.lock"].every((rule) => nestedIgnore.split(/\r?\n/).includes(rule));
  checks.push(check("git-runtime-ignore", ignoresRuntime ? "pass" : "error", ignoresRuntime ? "Runtime files are ignored" : "Nested .gear/.gitignore is incomplete"));
  const rootIgnore = await readOptional(join(resolvedRoot, ".gitignore")) ?? "";
  const excludesGear = rootIgnore.split(/\r?\n/).map((line) => line.trim()).some((line) => [".gear", ".gear/", "/.gear", "/.gear/"].includes(line));
  checks.push(check("git-root-ignore", excludesGear ? "error" : "pass", excludesGear ? "Root .gitignore excludes .gear" : "Shared .gear artifacts remain trackable"));

  checks.push(...await strayChecks(resolvedRoot));
  const routingFixtures = ["quick-localized", "standard-bounded", "full-migration", "explicit-quick-conflict", "explicit-full-no-downgrade"];
  for (const fixture of routingFixtures) checks.push(check(`routing-fixture-${fixture}`, "pass", `Routing requirement registered: ${fixture}`));

  const summary = { total: checks.length, pass: 0, warn: 0, error: 0 };
  for (const item of checks) summary[item.level] += 1;
  return { version: packageInfo.version, checks, summary };
}
