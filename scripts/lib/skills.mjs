import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

function metadata(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const values = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z][\w-]*):\s*["']?([^"']+?)["']?\s*$/);
    if (field) values[field[1]] = field[2];
  }
  return values.name ? { name: values.name, version: values.version ?? null } : null;
}

async function scan(path, evidence) {
  let entries;
  try {
    entries = await readdir(path, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) await scan(child, evidence);
    else if (entry.name === "SKILL.md") {
      const parsed = metadata(await readFile(child, "utf8"));
      if (parsed) evidence.push({ ...parsed, path: child });
    }
  }
}

export async function discoverSkills(roots) {
  const evidence = [];
  for (const root of [...new Set(roots.map((item) => resolve(item)))]) await scan(root, evidence);
  return evidence.sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path));
}
