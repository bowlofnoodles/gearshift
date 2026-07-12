import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const jsonWriteQueues = new Map();

export async function writeIfMissing(path, content) {
  await mkdir(dirname(path), { recursive: true });

  try {
    await writeFile(path, content, { flag: "wx" });
    return "created";
  } catch (error) {
    if (error.code === "EEXIST") {
      return "preserved";
    }
    throw error;
  }
}

export function writeJsonAtomic(path, value) {
  const queueKey = resolve(path);
  const previousWrite = jsonWriteQueues.get(queueKey) ?? Promise.resolve();
  const write = previousWrite.catch(() => {}).then(async () => {
    const temporaryPath = `${path}.${randomUUID()}.tmp`;
    const json = `${JSON.stringify(value, null, 2)}\n`;

    await mkdir(dirname(path), { recursive: true });
    try {
      await writeFile(temporaryPath, json, { flag: "wx" });
      await rename(temporaryPath, path);
    } finally {
      await rm(temporaryPath, { force: true }).catch(() => {});
    }
  });

  jsonWriteQueues.set(queueKey, write);
  return write.finally(() => {
    if (jsonWriteQueues.get(queueKey) === write) {
      jsonWriteQueues.delete(queueKey);
    }
  });
}

export function upsertManagedBlock(content, marker, body) {
  const start = `<!-- ${marker}:START -->`;
  const end = `<!-- ${marker}:END -->`;
  const startCount = content.split(start).length - 1;
  const endCount = content.split(end).length - 1;
  const startIndex = content.indexOf(start);
  const endIndex = content.indexOf(end);

  if (
    startCount !== endCount ||
    startCount > 1 ||
    (startCount === 1 && endIndex < startIndex)
  ) {
    throw new Error(`Unmatched managed block markers for ${marker}`);
  }

  const normalizedBody = body.replace(/^\n+|\n+$/g, "");
  const block = `${start}\n${normalizedBody}\n${end}`;

  if (startIndex !== -1) {
    const endOffset = endIndex + end.length;
    return `${content.slice(0, startIndex)}${block}${content.slice(endOffset)}`;
  }

  if (content.length === 0) {
    return `${block}\n`;
  }

  const separator = content.endsWith("\n") ? "\n" : "\n\n";
  return `${content}${separator}${block}\n`;
}

export function mergeLines(content, requiredLines) {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const seen = new Set(lines);
  const merged = [...seen];

  for (const line of requiredLines) {
    if (line.trim().length > 0 && !seen.has(line)) {
      merged.push(line);
      seen.add(line);
    }
  }

  return merged.length === 0 ? "" : `${merged.join("\n")}\n`;
}
