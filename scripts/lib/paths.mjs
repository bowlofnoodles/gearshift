import { join, resolve } from "node:path";

export function gearPaths(root) {
  const resolvedRoot = resolve(root);
  const gear = join(resolvedRoot, ".gear");
  const context = join(gear, "context");
  const runtime = join(gear, ".runtime");

  return {
    root: resolvedRoot,
    gear,
    config: join(gear, "config.yaml"),
    index: join(gear, "index.md"),
    context,
    glossary: join(context, "glossary.md"),
    architecture: join(context, "architecture.md"),
    adr: join(gear, "adr"),
    tasks: join(gear, "tasks"),
    runtime,
    currentTask: join(runtime, "current-task"),
  };
}
