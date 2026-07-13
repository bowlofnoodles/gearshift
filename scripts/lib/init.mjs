import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { upsertManagedBlock } from "./files.mjs";

export const MANAGED_GUIDANCE = [
  "For every coding change, invoke the Gearshift complexity router before any third-party development workflow.",
  "Explicit gear selection wins.",
  "Use Gearshift's native Quick and Complex workflows; do not invoke third-party workflows unless the user explicitly requests them.",
  "Use Gearshift's native Quick and Complex workflows; let referenced Skills use their native document behavior.",
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


export async function initializeRepository({ root, guidanceTargets = ["AGENTS.md", "CLAUDE.md"] }) {
  const resolvedRoot = resolve(root);
  const report = { created: [], preserved: [], warnings: [], errors: [] };

  for (const target of guidanceTargets) {
    const targetPath = isAbsolute(target) ? target : resolve(resolvedRoot, target);
    const original = await readText(targetPath);
    try {
      const updated = upsertManagedBlock(original, "GEARSHIFT", MANAGED_GUIDANCE);
      if (updated !== original) {
        await writeFile(targetPath, updated);
        report.created.push(displayPath(resolvedRoot, targetPath));
      } else {
        report.preserved.push(displayPath(resolvedRoot, targetPath));
      }
    } catch (error) {
      report.errors.push(`${displayPath(resolvedRoot, targetPath)}: ${error.message}`);
    }
  }

  return report;
}
