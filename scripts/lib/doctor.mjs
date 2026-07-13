import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { MANAGED_GUIDANCE } from "./init.mjs";
import { discoverSkills } from "./skills.mjs";

const PLUGIN_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const check = (id, level, message, path) => ({ id, level, message, ...(path ? { path } : {}) });
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

function selectEvidence(evidence, names, range) {
  const candidates = evidence.filter((item) => names.includes(item.name));
  const compatible = candidates.filter((item) => supported(item.version, range));
  const pool = compatible.length > 0 ? compatible : candidates;
  return pool.sort((a, b) => {
    const left = tuple(a.version);
    const right = tuple(b.version);
    if (left && right) return compare(right, left);
    if (left) return -1;
    if (right) return 1;
    return a.path.localeCompare(b.path);
  })[0];
}

export async function runDoctor({ root, skillRoots = [] }) {
  const resolvedRoot = resolve(root);
  const checks = [];
  const compatibility = JSON.parse(await readFile(join(PLUGIN_ROOT, "compatibility.json"), "utf8"));
  const packageInfo = JSON.parse(await readFile(join(PLUGIN_ROOT, "package.json"), "utf8"));
  checks.push(check("plugin-version", "pass", `Gearshift ${packageInfo.version}`));

  const roots = skillRoots.length > 0 ? skillRoots : [
    join(resolvedRoot, ".agents", "skills"),
    join(resolvedRoot, ".claude", "skills"),
    join(resolvedRoot, ".codex", "skills"),
    join(homedir(), ".agents", "skills"),
    join(homedir(), ".claude", "skills"),
    join(homedir(), ".codex", "skills"),
    join(homedir(), ".claude", "plugins", "cache"),
    join(homedir(), ".codex", "plugins", "cache"),
  ];
  const evidence = await discoverSkills(roots);
  const grills = ["grill-me", "grill-with-docs"].map((name) => selectEvidence(
    evidence,
    [name],
    compatibility.dependencies["mattpocock-skills"].supported,
  ));
  const grillsPresent = grills.every(Boolean);
  const grillVersionsKnown = grillsPresent && grills.every((item) => item.version);
  const mattCompatible = grillVersionsKnown
    && grills.every((item) => supported(item.version, compatibility.dependencies["mattpocock-skills"].supported));
  const mattLevel = !grillsPresent || (grillVersionsKnown && !mattCompatible)
    ? "error"
    : grillVersionsKnown ? "pass" : "warning";
  const mattMessage = !grillsPresent
    ? "Compatible grill-me and grill-with-docs are required"
    : !grillVersionsKnown
      ? "grill-me and grill-with-docs are installed, but their versions are not declared"
      : mattCompatible
        ? "grill-me and grill-with-docs are compatible"
        : "Installed grill-me or grill-with-docs version is incompatible";
  checks.push(check(
    "dependency-mattpocock-skills",
    mattLevel,
    mattMessage,
  ));

  for (const target of ["AGENTS.md", "CLAUDE.md"]) {
    const content = await readOptional(join(resolvedRoot, target));
    if (content === null) continue;
    const valid = content.includes("<!-- GEARSHIFT:START -->") && content.includes(MANAGED_GUIDANCE) && content.includes("<!-- GEARSHIFT:END -->");
    checks.push(check("guidance-managed", valid ? "pass" : "error", `${target} Gearshift block ${valid ? "is valid" : "conflicts with the managed contract"}`, target));
  }

  const routingFixtures = ["quick-localized", "complex-bounded", "complex-migration", "explicit-quick-conflict", "explicit-complex-no-downgrade"];
  for (const fixture of routingFixtures) checks.push(check(`routing-fixture-${fixture}`, "pass", `Routing requirement registered: ${fixture}`));

  const summary = { total: checks.length, pass: 0, warning: 0, error: 0 };
  for (const item of checks) summary[item.level] += 1;
  return { version: packageInfo.version, checks, summary };
}
