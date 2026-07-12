import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const check = (id, level, message, path) => ({ id, level, message, ...(path ? { path } : {}) });
const exists = (path) => access(path, constants.F_OK).then(() => true, () => false);

async function walk(root, current = root) {
  let entries;
  try {
    entries = await readdir(current, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    if ([".git", ".gear", "node_modules"].includes(entry.name)) continue;
    const path = join(current, entry.name);
    if (entry.isDirectory()) files.push(...await walk(root, path));
    else files.push(path);
  }
  return files;
}

async function strayChecks(root) {
  const checks = [];
  for (const path of await walk(root)) {
    const rel = relative(root, path).split("\\").join("/");
    if (rel.startsWith("docs/superpowers/specs/")) {
      checks.push(check("artifact-stray-superpowers", "error", "Found artifact outside the Gearshift contract", rel));
    }
    if (rel.split("/").at(-1) === "CONTEXT.md") {
      checks.push(check("artifact-stray-context", "error", "Found CONTEXT.md outside .gear/context", rel));
    }
  }
  return checks;
}

async function linkChecks(root, markdownPath) {
  const content = await readFile(markdownPath, "utf8");
  const checks = [];
  for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].split("#")[0];
    if (!target || /^(?:https?:|mailto:|#)/.test(match[1])) continue;
    const resolved = resolve(dirname(markdownPath), decodeURIComponent(target));
    if (!(await exists(resolved))) {
      checks.push(check("artifact-link", "error", `Broken relative Markdown link: ${match[1]}`, relative(root, markdownPath)));
    }
  }
  return checks;
}

export async function validateTaskArtifacts(root, task) {
  const checks = [];
  if (task.complexity !== "quick") {
    const directory = join(resolve(root), ".gear", "tasks", task.id);
    const required = ["task.json", "brief.md", "plan.md", "summary.md"];
    if (task.complexity === "full") required.push("design.md");
    for (const name of required) {
      const path = join(directory, name);
      if (await exists(path)) {
        checks.push(check("artifact-required", "pass", `Required artifact exists: ${name}`, relative(root, path)));
        if (name.endsWith(".md")) checks.push(...await linkChecks(root, path));
      } else checks.push(check("artifact-required", "error", `Missing required artifact: ${name}`, relative(root, path)));
    }
  }
  checks.push(...await strayChecks(resolve(root)));
  return checks;
}

export { strayChecks };
