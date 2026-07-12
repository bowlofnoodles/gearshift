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
      "Standard",
      "Full",
      "$gearshift:init",
      "/gear:init",
      ".gear/",
      "Superpowers",
      "grill-me",
      "continue",
      "doctor",
      "MIT",
    ]) assert.ok(content.includes(phrase), `${path} includes ${phrase}`);
    assert.match(content, /natural language|自然语言/i);
    assert.match(content, /troubleshoot|故障排查/i);
    assert.match(content, /button color|按钮颜色/i);
  }
});

test("documentation distinguishes Codex and Claude syntax", async () => {
  const english = await readFile("README.md", "utf8");
  assert.match(english, /\| Codex \| Claude Code \|/);
  assert.match(english, /\$gearshift:quick/);
  assert.match(english, /\/gear:quick/);
  assert.doesNotMatch(english, /Codex[^\n]*`\/gear:/i);
  assert.doesNotMatch(english, /Claude Code[^\n]*`\$gearshift:/i);
  assert.match(english, /\/hooks/);
});

test("documentation provides verified Codex marketplace installation", async () => {
  for (const path of readmes) {
    const content = await readFile(path, "utf8");
    assert.match(content, /codex plugin marketplace add bowlofnoodles\/gearshift --ref main/);
    assert.match(content, /codex plugin add gearshift@gearshift/);
    assert.match(content, /codex plugin marketplace upgrade gearshift/);
    assert.doesNotMatch(content, /<your-local-marketplace>|<你的本地 marketplace>/i);
  }
});

test("README image links resolve and badges describe real state", async () => {
  for (const path of readmes) {
    const content = await readFile(path, "utf8");
    const markdownImages = [...content.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((match) => match[1]);
    const htmlImages = [...content.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1]);
    const images = [...markdownImages, ...htmlImages];
    assert.ok(images.includes("assets/logo.svg"));
    for (const image of images.filter((target) => !/^https?:/.test(target))) await access(image);
    assert.doesNotMatch(content, /downloads|coverage|release-v|version-[0-9]/i);
  }
});

test("SVG identity is accessible and manifest assets resolve", async () => {
  for (const path of ["assets/logo.svg", "assets/icon.svg"]) {
    const svg = await readFile(path, "utf8");
    assert.match(svg, /<title>Gearshift<\/title>/);
    assert.match(svg, /viewBox=/);
    assert.doesNotMatch(svg, /data:image|<image\b/i);
  }
  const manifest = JSON.parse(await readFile(".codex-plugin/plugin.json", "utf8"));
  assert.equal(manifest.interface.composerIcon, "./assets/icon.svg");
  assert.equal(manifest.interface.logo, "./assets/logo.svg");
  await access(manifest.interface.composerIcon);
  await access(manifest.interface.logo);
});

test("community files describe reproducible contribution and license policy", async () => {
  const contributing = await readFile("CONTRIBUTING.md", "utf8");
  for (const phrase of ["Node.js 18", "npm test", "quick_validate.py", "router-cases.json", "vendor"]) {
    assert.ok(contributing.includes(phrase), `CONTRIBUTING includes ${phrase}`);
  }
  const changelog = await readFile("CHANGELOG.md", "utf8");
  assert.match(changelog, /0\.1\.0 - 2026-07-11/);
  const license = await readFile("LICENSE", "utf8");
  assert.match(license, /MIT License/);
  assert.match(license, /Copyright \(c\) 2026 bowlofnoodles/);
});

test("CI covers supported operating systems and Node versions", async () => {
  const workflow = await readFile(".github/workflows/ci.yml", "utf8");
  for (const value of ["ubuntu-latest", "macos-latest", "windows-latest", "node: [18, 22]", "npm test", "npm run validate", "git diff --check"]) {
    assert.ok(workflow.includes(value), `CI includes ${value}`);
  }
  for (const path of readmes) {
    assert.match(await readFile(path, "utf8"), /actions\/workflows\/ci\.yml\/badge\.svg/);
  }
});
