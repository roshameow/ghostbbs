import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseHash, buildHash, shortcutFor } from "../src/router.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = [join(root, "index.html"), ...walk(join(root, "src")), ...walk(join(root, "css"))];
const read = (f) => readFileSync(f, "utf8");

const FORBIDDEN = [
  [/https?:\/\//i, "remote URL"],
  [/\bfetch\s*\(/, "fetch("],
  [/XMLHttpRequest/, "XMLHttpRequest"],
  [/\bWebSocket\b/, "WebSocket"],
  [/sendBeacon/, "sendBeacon"],
  [/innerHTML|outerHTML|insertAdjacentHTML/, "HTML injection API"],
  [/document\.write/, "document.write"],
  [/\beval\s*\(/, "eval("],
  [/new\s+Function\b/, "new Function"],
  [/@import|url\(\s*['"]?https?:/i, "remote CSS"],
  [/sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|BEGIN [A-Z ]*PRIVATE KEY/, "key-like string"],
  [/(api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']+["']/i, "credential assignment"],
];

test("no forbidden patterns in index.html, src/ and css/", () => {
  for (const f of files) {
    const text = read(f);
    for (const [re, label] of FORBIDDEN) {
      assert.ok(!re.test(text), `${f} contains ${label}`);
    }
  }
});

test("agent logic avoids Math.random and Date.now", () => {
  for (const f of ["agents.js", "prng.js", "seed.js"]) {
    const text = read(join(root, "src", f));
    assert.ok(!/Math\.random|Date\.now|new Date\(\)/.test(text), `${f} uses nondeterministic time or randomness`);
  }
});

test("pure logic modules do not touch the DOM", () => {
  for (const f of ["store.js", "agents.js", "diff.js", "search.js", "validate.js", "prng.js", "seed.js", "router.js"]) {
    const text = read(join(root, "src", f));
    assert.ok(!/\bdocument\./.test(text), `${f} touches document`);
  }
});

test("index.html has strict CSP, landmarks, live region and no inline code", () => {
  const html = read(join(root, "index.html"));
  assert.match(html, /http-equiv="Content-Security-Policy"/);
  assert.match(html, /default-src 'self'/);
  assert.ok(!/unsafe-inline|unsafe-eval/.test(html));
  assert.match(html, /<header/);
  assert.match(html, /<nav/);
  assert.match(html, /<main/);
  assert.match(html, /<footer/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /deterministic simulations/i);
  assert.match(html, /<script type="module" src="src\/main\.js"><\/script>/);
  const inlineScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(
    (m) => !/\bsrc=/.test(m[1]) || m[2].trim() !== "",
  );
  assert.equal(inlineScripts.length, 0);
  assert.ok(!/\sstyle=/.test(html), "inline style attribute");
  assert.ok(!/<style\b/.test(html), "inline style element");
  assert.ok(!/\son[a-z]+\s*=/i.test(html), "inline event handler");
});

test("required project files exist and .kiro is not ignored", () => {
  for (const f of ["README.md", "LICENSE", ".gitignore", "docs/KIRO_USAGE.md", "css/ghostbbs.css", ".kiro/hooks/verify-tests.json"]) {
    assert.ok(existsSync(join(root, f)), `${f} missing`);
  }
  const ignore = read(join(root, ".gitignore")).split("\n").map((l) => l.trim());
  assert.ok(!ignore.some((l) => /^\/?\.kiro\/?\*?$/.test(l)), ".kiro must not be ignored");
  assert.match(read(join(root, "LICENSE")), /Copyright \(c\) 2026 Wen Liu/);
});

test("kiro hook uses the v1 schema and the exact test command", () => {
  const hook = JSON.parse(read(join(root, ".kiro/hooks/verify-tests.json")));
  assert.equal(hook.version, "v1");
  const h = hook.hooks[0];
  assert.equal(h.trigger, "PostFileSave");
  assert.equal(h.action.type, "command");
  assert.equal(h.action.command, "node --test tests/*.test.mjs");
  assert.doesNotThrow(() => new RegExp(h.matcher));
});

test("README discloses simulated agents", () => {
  const readme = read(join(root, "README.md"));
  assert.match(readme, /SIMULATED/);
  assert.match(readme, /python3 -m http\.server 8000/);
});

test("router parses and builds hashes", () => {
  assert.equal(parseHash("").name, "menu");
  assert.equal(parseHash("#/boards").name, "boards");
  assert.deepEqual(parseHash("#/thread/t2").params, { id: "t2" });
  assert.deepEqual(parseHash("#/search?q=a&status=open").query, { q: "a", status: "open" });
  assert.equal(parseHash("#/bogus").name, "notfound");
  assert.equal(parseHash("#/thread/%E0%A4%A").name, "notfound");
  assert.equal(buildHash("thread", "t 1"), "#/thread/t%201");
  assert.equal(buildHash("search", null, { q: "x" }), "#/search?q=x");
});

test("keyboard shortcuts are disabled inside inputs", () => {
  assert.deepEqual(shortcutFor("b", { tagName: "DIV" }), { type: "nav", hash: "#/boards" });
  assert.equal(shortcutFor("b", { tagName: "INPUT" }), null);
  assert.equal(shortcutFor("b", { tagName: "TEXTAREA" }), null);
  assert.equal(shortcutFor("b", { tagName: "SELECT" }), null);
  assert.equal(shortcutFor("b", { tagName: "DIV", isContentEditable: true }), null);
  assert.equal(shortcutFor("z", { tagName: "DIV" }), null);
  assert.equal(shortcutFor("toString", { tagName: "DIV" }), null);
});
