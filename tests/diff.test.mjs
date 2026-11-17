import test from "node:test";
import assert from "node:assert/strict";
import { parseUnified, markerFor, diffStats } from "../src/diff.js";

const SAMPLE = [
  "--- a/f.js",
  "+++ b/f.js",
  "@@ -1,3 +1,3 @@",
  " keep",
  "-old",
  "+new",
].join("\n");

test("classifies unified diff lines", () => {
  const lines = parseUnified(SAMPLE);
  assert.deepEqual(lines.map((l) => l.type), ["meta", "meta", "hunk", "ctx", "del", "add"]);
  assert.equal(lines[4].text, "-old");
  assert.equal(lines[5].text, "+new");
});

test("handles empty, non-string and CRLF input", () => {
  assert.deepEqual(parseUnified(""), []);
  assert.deepEqual(parseUnified(null), []);
  assert.deepEqual(parseUnified("+a\r\n-b\r\n").map((l) => l.type), ["add", "del"]);
});

test("markers and stats", () => {
  assert.equal(markerFor("add"), "+");
  assert.equal(markerFor("del"), "-");
  assert.equal(markerFor("ctx"), " ");
  assert.deepEqual(diffStats(parseUnified(SAMPLE)), { added: 1, removed: 1 });
});
