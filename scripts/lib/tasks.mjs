import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { writeIfMissing, writeJsonAtomic } from "./files.mjs";
import { gearPaths } from "./paths.mjs";

const NEXT_STATUS = {
  planning: "ready",
  ready: "implementing",
  implementing: "verifying",
  verifying: "completed",
};
const TERMINAL = new Set(["completed", "cancelled"]);
const PHASE = {
  planning: "planning",
  ready: "planning-complete",
  implementing: "implementation",
  verifying: "verification",
  completed: "complete",
  blocked: "blocked",
  cancelled: "cancelled",
};

function slugify(title) {
  return title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function datePrefix(now) {
  return now.toISOString().slice(0, 10);
}

function taskDirectory(root, id) {
  return join(gearPaths(root).tasks, id);
}

async function readOptional(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function createTask({ root, title, complexity, now = new Date(), engines = {} }) {
  if (!new Set(["standard", "full"]).has(complexity)) {
    throw new Error(`Task complexity must be standard or full, received ${complexity}`);
  }
  const slug = slugify(title);
  if (!slug) throw new Error("Task title must contain letters or numbers");
  const id = `${datePrefix(now)}-${slug}`;
  const directory = taskDirectory(root, id);
  try {
    await mkdir(directory, { recursive: false });
  } catch (error) {
    if (error.code === "EEXIST") throw new Error(`Task ${id} already exists`);
    if (error.code === "ENOENT") {
      await mkdir(gearPaths(root).tasks, { recursive: true });
      await mkdir(directory);
    } else throw error;
  }

  const artifacts = {
    brief: "brief.md",
    plan: "plan.md",
    ...(complexity === "full" ? { design: "design.md" } : {}),
    summary: "summary.md",
  };
  const timestamp = now.toISOString();
  const task = {
    schemaVersion: 1,
    id,
    title,
    complexity,
    status: "planning",
    phase: "planning",
    createdAt: timestamp,
    updatedAt: timestamp,
    artifacts,
    engines,
    history: [],
  };

  await writeIfMissing(join(directory, "brief.md"), `# ${title}: Brief\n`);
  await writeIfMissing(join(directory, "plan.md"), `# ${title}: Plan\n`);
  if (complexity === "full") {
    await writeIfMissing(join(directory, "design.md"), `# ${title}: Design\n`);
  }
  await writeJsonAtomic(join(directory, "task.json"), task);
  await setCurrentTask(root, id);
  return task;
}

export async function readTask(root, id) {
  const content = await readFile(join(taskDirectory(root, id), "task.json"), "utf8");
  return JSON.parse(content);
}

export async function transitionTask({ root, id, to, now = new Date() }) {
  const task = await readTask(root, id);
  const from = task.status;
  let allowed = NEXT_STATUS[from] === to || to === "blocked" || to === "cancelled";
  if (from === "blocked" && to === task.previousStatus) allowed = true;
  if (TERMINAL.has(from)) allowed = false;
  if (!allowed) throw new Error(`Invalid task transition from ${from} to ${to}`);

  if (to === "blocked") task.previousStatus = from;
  else if (from === "blocked") delete task.previousStatus;
  task.status = to;
  task.phase = PHASE[to];
  task.updatedAt = now.toISOString();
  task.history.push({ from, to, at: task.updatedAt });
  await writeJsonAtomic(join(taskDirectory(root, id), "task.json"), task);
  return task;
}

export async function listIncompleteTasks(root) {
  const directory = gearPaths(root).tasks;
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const tasks = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const task = await readTask(root, entry.name);
      if (!TERMINAL.has(task.status)) tasks.push(task);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return tasks.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function setCurrentTask(root, id) {
  const path = gearPaths(root).currentTask;
  await mkdir(gearPaths(root).runtime, { recursive: true });
  if (id === null) {
    await rm(path, { force: true });
    return;
  }
  await writeFile(path, `${id}\n`);
}

async function inconsistencyReasons(root, task, { hasImplementationChanges }) {
  const directory = taskDirectory(root, task.id);
  const required = ["task.json", "brief.md", "plan.md"];
  if (task.complexity === "full") required.push("design.md");
  const reasons = [];
  for (const artifact of required) {
    if ((await readOptional(join(directory, artifact))) === null) reasons.push(`Missing required artifact ${artifact}`);
  }
  const summary = await readOptional(join(directory, "summary.md"));
  if (task.status === "planning" && (summary !== null || hasImplementationChanges)) {
    reasons.push("Task is planning but summary or implementation changes already exist");
  }
  return reasons;
}

export async function continuationDecision({ root, hasImplementationChanges = false }) {
  const pointer = (await readOptional(gearPaths(root).currentTask))?.trim();
  let pointedTask = null;
  if (pointer) {
    try {
      pointedTask = await readTask(root, pointer);
      if (TERMINAL.has(pointedTask.status)) {
        return { action: "repair", task: pointedTask, reasons: [`${pointedTask.status} task is still selected as current`] };
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  const tasks = await listIncompleteTasks(root);
  if (tasks.length === 0) return { action: "start" };
  if (tasks.length > 1) return { action: "choose", tasks };
  const task = pointedTask ?? tasks[0];
  const reasons = await inconsistencyReasons(root, task, { hasImplementationChanges });
  if (reasons.length > 0) return { action: "repair", task, reasons };
  return { action: "resume", task };
}
