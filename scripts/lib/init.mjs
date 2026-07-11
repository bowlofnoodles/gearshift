import { mkdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { mergeLines, upsertManagedBlock, writeIfMissing } from "./files.mjs";
import { gearPaths } from "./paths.mjs";

const TEMPLATE_ROOT = fileURLToPath(new URL("../../templates/gear/", import.meta.url));
const IGNORE_RULES = ["/.runtime/", "*.tmp", "*.lock"];
const ROOT_GEAR_IGNORE_RULES = new Set([".gear", ".gear/", "/.gear", "/.gear/"]);

export const MANAGED_GUIDANCE = [
  "For every coding change, invoke the Gearshift complexity router before any third-party development workflow.",
  "Explicit gear selection wins.",
  "Do not invoke Superpowers directly unless Gearshift selected Full or the user explicitly requested a specific Superpowers skill.",
  "Read .gear/config.yaml for project-specific classification rules and .gear/index.md for active tasks.",
].join("\n");

async function readText(path, fallback = "") {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

function displayPath(root, path) {
  return relative(root, path).split("\\").join("/") || ".";
}

async function installTemplate(report, root, destination, templateName) {
  const content = await readFile(resolve(TEMPLATE_ROOT, templateName), "utf8");
  const result = await writeIfMissing(destination, content);
  report[result].push(displayPath(root, destination));
}

export async function initializeRepository({ root, guidanceTargets = ["AGENTS.md", "CLAUDE.md"] }) {
  const paths = gearPaths(root);
  const report = { created: [], preserved: [], warnings: [], errors: [] };

  await Promise.all([
    mkdir(paths.context, { recursive: true }),
    mkdir(paths.adr, { recursive: true }),
    mkdir(paths.tasks, { recursive: true }),
    mkdir(paths.runtime, { recursive: true }),
  ]);

  await installTemplate(report, paths.root, paths.config, "config.yaml");
  await installTemplate(report, paths.root, paths.index, "index.md");
  await installTemplate(report, paths.root, paths.glossary, "glossary.md");
  await installTemplate(report, paths.root, paths.architecture, "architecture.md");

  const nestedIgnore = resolve(paths.gear, ".gitignore");
  const existingNestedIgnore = await readText(nestedIgnore);
  const mergedNestedIgnore = mergeLines(existingNestedIgnore, IGNORE_RULES);
  if (mergedNestedIgnore !== existingNestedIgnore) {
    await writeFile(nestedIgnore, mergedNestedIgnore);
    report.created.push(displayPath(paths.root, nestedIgnore));
  } else {
    report.preserved.push(displayPath(paths.root, nestedIgnore));
  }

  const rootIgnorePath = resolve(paths.root, ".gitignore");
  const rootIgnore = await readText(rootIgnorePath);
  const rootRules = rootIgnore
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
  if (rootRules.some((rule) => ROOT_GEAR_IGNORE_RULES.has(rule))) {
    report.errors.push("Root .gitignore excludes .gear; shared Gearshift artifacts cannot be tracked.");
  }

  for (const target of guidanceTargets) {
    const targetPath = isAbsolute(target) ? target : resolve(paths.root, target);
    const original = await readText(targetPath);
    try {
      const updated = upsertManagedBlock(original, "GEARSHIFT", MANAGED_GUIDANCE);
      if (updated !== original) {
        await writeFile(targetPath, updated);
        report.created.push(displayPath(paths.root, targetPath));
      } else {
        report.preserved.push(displayPath(paths.root, targetPath));
      }
    } catch (error) {
      report.errors.push(`${displayPath(paths.root, targetPath)}: ${error.message}`);
    }
  }

  return report;
}
