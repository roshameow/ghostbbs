import test from "node:test";
import assert from "node:assert/strict";
import { createSeed } from "../src/seed.js";
import { buildLedger, summarizeLedger, filterLedger } from "../src/ledger.js";

const post = (id, kind, createdAt, extra) => ({ id, authorId: "a1", kind, createdAt, body: "x", ...extra });
const thread = (id, posts) => ({ id, boardId: "bugs", title: `T ${id}`, body: "b", author: "u", status: "open", createdAt: "2026-01-01T00:00:00.000Z", posts, scriptStep: 0 });
const DIFF = { diff: { filename: "a.js", unified: "+x" } };
const ver = (result) => ({ verification: { command: "cmd", result, simulated: true } });

test("seed ledger has PASS and FAIL entries and only diff/verification kinds", () => {
  const entries = buildLedger(createSeed());
  assert.ok(entries.length > 0);
  assert.ok(entries.every((e) => e.kind === "diff" || e.kind === "verification"));
  const counts = summarizeLedger(entries);
  assert.ok(counts.PASS > 0 && counts.FAIL > 0);
  const v = entries.filter((e) => e.kind === "verification");
  for (const e of v) assert.equal(e.outcome, e.result === "pass" ? "PASS" : "FAIL");
  assert.ok(v.every((e) => e.simulated === true && typeof e.command === "string"));
  assert.ok(entries.filter((e) => e.kind === "diff").every((e) => typeof e.filename === "string"));
});

test("ordering is deterministic and independent of thread order", () => {
  const s = createSeed();
  const a = buildLedger(s);
  const rev = { ...s, threads: [...s.threads].reverse() };
  assert.deepEqual(buildLedger(rev), a);
  assert.deepEqual(buildLedger(createSeed()), a);
  for (let i = 1; i < a.length; i++) assert.ok(a[i - 1].createdAt <= a[i].createdAt);
});

test("ties on createdAt break by thread id then post id", () => {
  const ts = "2026-02-01T00:00:00.000Z";
  const s = { threads: [thread("t2", [post("p2", "diff", ts, DIFF)]), thread("t1", [post("p9", "diff", ts, DIFF), post("p3", "diff", ts, DIFF)])] };
  assert.deepEqual(buildLedger(s).map((e) => `${e.threadId}/${e.postId}`), ["t1/p3", "t1/p9", "t2/p2"]);
});

test("diff without verification is UNKNOWN", () => {
  const s = { threads: [thread("t1", [post("p1", "diff", "2026-01-01T00:00:01.000Z", DIFF)])] };
  const [e] = buildLedger(s);
  assert.equal(e.outcome, "UNKNOWN");
  assert.equal(e.filename, "a.js");
  assert.equal(e.command, undefined);
});

test("verification outcomes and diff linkage", () => {
  const s = { threads: [thread("t1", [
    post("p1", "diff", "2026-01-01T00:00:01.000Z", DIFF),
    post("p2", "verification", "2026-01-01T00:00:02.000Z", ver("fail")),
    post("p3", "verification", "2026-01-01T00:00:03.000Z", ver("pass")),
  ])] };
  assert.deepEqual(buildLedger(s).map((e) => e.outcome), ["FAIL", "FAIL", "PASS"]);
});

test("filterLedger selects by outcome and ignores unknown filter values", () => {
  const entries = buildLedger(createSeed());
  for (const o of ["PASS", "FAIL", "UNKNOWN"]) assert.ok(filterLedger(entries, o).every((e) => e.outcome === o));
  assert.equal(filterLedger(entries, "ALL").length, entries.length);
  assert.equal(filterLedger(entries, "bogus").length, entries.length);
});

test("buildLedger does not mutate state", () => {
  const s = createSeed();
  const before = JSON.stringify(s);
  buildLedger(s);
  assert.equal(JSON.stringify(s), before);
  const frozen = JSON.parse(before);
  const deep = (o) => { if (o && typeof o === "object") { Object.values(o).forEach(deep); Object.freeze(o); } };
  deep(frozen);
  assert.doesNotThrow(() => buildLedger(frozen));
});

test("router maps #/ledger and the L shortcut", async () => {
  const { parseHash, shortcutFor } = await import("../src/router.js");
  assert.equal(parseHash("#/ledger?result=FAIL").name, "ledger");
  assert.equal(parseHash("#/ledger?result=FAIL").query.result, "FAIL");
  assert.deepEqual(shortcutFor("L", { tagName: "DIV" }), { type: "nav", hash: "#/ledger" });
  assert.equal(shortcutFor("l", { tagName: "INPUT" }), null);
});
