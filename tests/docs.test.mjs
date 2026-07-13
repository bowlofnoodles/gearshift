import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const readmes = ["README.md", "README.zh-CN.md"];

test("English and Chinese READMEs are complete and cross-linked", async () => {
  const [english, chinese] = await Promise.all(readmes.map((path) => readFile(path, "utf8")));
  assert.match(english, /README\.zh-CN\.md/);
  assert.match(chinese, /README\.md/);
  for (const [path, content] of [[readmes[0], english], [readmes[1], chinese]]) {
    for (const phrase of [
      "Quick",
      "Complex",
      "$gearshift:init",
      "$gearshift:complex",
      "codex plugin marketplace add",
      "codex plugin install gearshift",
      "grill-me",
      "grill-with-docs",
      "Codex plan",
      "doctor",
      "MIT",
    ]) assert.ok(content.includes(phrase), `${path} includes ${phrase}`);
    assert.match(content, /Codex/i);
    assert.match(content, /button-?color|按钮颜色/i);
    assert.doesNotMatch(content, /\/gearshift:/);
  }
});

test("documentation documents Codex syntax only", async () => {
  const english = await readFile("README.md", "utf8");
  assert.match(english, /\$gearshift:quick/);
  assert.match(english, /\$gearshift:complex/);
  assert.doesNotMatch(english, /\| Codex \| Claude Code \|/);
  assert.match(english, /codex plugin marketplace add bowlofnoodles\/gearshift --ref main/);
  assert.match(english, /codex plugin install gearshift/);
  assert.doesNotMatch(english, /claude plugin marketplace/i);
});

test("README image links resolve when present", async () => {
  for (const path of readmes) {
    const content = await readFile(path, "utf8");
    for (const match of content.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1].split("#")[0];
      if (!target || /^https?:/.test(target)) continue;
      await access(target);
    }
  }
});

test("community files describe reproducible contribution and license policy", async () => {
  const contributing = await readFile("CONTRIBUTING.md", "utf8");
  const license = await readFile("LICENSE", "utf8");
  assert.match(contributing, /npm test/);
  assert.match(contributing, /Quick.*Complex/i);
  assert.match(license, /MIT License/);
});
