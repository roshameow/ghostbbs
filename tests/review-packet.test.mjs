import test from "node:test";
import assert from "node:assert/strict";
import { createSeed } from "../src/seed.js";
import { buildReviewPacket } from "../src/review-packet.js";
import { buildHash, parseHash } from "../src/router.js";
import { buildLedger } from "../src/ledger.js";

const md = (id) => buildReviewPacket(createSeed(), id);

test("packet has SIMULATED disclosure, metadata and root-cause note", () => {
  const out = md("t2");
  assert.match(out, /SIMULATED/);
  assert.match(out, /no command|not executed|did not run|do not run/i);
  assert.match(out, /Board: Bugs/);
  assert.match(out, /Status: verified/);
  assert.match(out, /Author: wick_and_wire/);
  assert.match(out, /Created: /);
  assert.match(out, /## Original task/);
  assert.match(out, /Evidence ledger for this thread/);
  assert.match(out, /Grouping does not prove a common root cause/);
});

test("packet covers only the target thread", () => {
  const s = createSeed();
  const out = buildReviewPacket(s, "t2");
  assert.ok(out.includes("Moth Lantern"));
  assert.ok(!out.includes("Read me first"));
  assert.ok(!out.includes("t1-p1"));
});

test("packet includes diff, verification and system posts", () => {
  const s = createSeed();
  const t = s.threads.find((x) => x.id === "t2");
  const out = buildReviewPacket(s, "t2");
  const d = t.posts.find((p) => p.kind === "diff");
  assert.ok(out.includes(d.diff.unified));
  assert.match(out, /--- a\/src\/layout.js/);
  const v = t.posts.find((p) => p.kind === "verification");
  assert.ok(out.includes(v.verification.command));
  assert.match(out, /Result: (PASS|FAIL)/);
  assert.match(out, /Source: SIMULATED/);
  assert.match(out, /No command was run/);
  assert.match(out, /System status change/);
  assert.match(out, /Status changed from open to in_progress/);
  for (const p of t.posts) assert.ok(out.includes(p.id));
});

test("posts appear in chronological order", () => {
  const s = createSeed();
  const t = s.threads.find((x) => x.id === "t2");
  const out = buildReviewPacket(s, "t2");
  let last = -1;
  for (const p of t.posts) {
    const i = out.indexOf(`### Post ${t.posts.indexOf(p) + 1}: ${p.id}`);
    assert.ok(i > last);
    last = i;
  }
});

test("output is deterministic and input is not mutated", () => {
  const s = createSeed();
  const before = JSON.stringify(s);
  const a = buildReviewPacket(s, "t2");
  assert.equal(JSON.stringify(s), before);
  assert.equal(buildReviewPacket(createSeed(), "t2"), a);
});

test("missing thread returns a short friendly message", () => {
  const out = md("nope");
  assert.match(out, /^# Review packet unavailable/);
  assert.ok(out.includes("nope"));
  assert.ok(out.length < 300);
  assert.equal(buildReviewPacket(null, "x").startsWith("# Review packet unavailable"), true);
});

test("user text cannot open headings or break fences", () => {
  const s = createSeed();
  s.threads[0].title = "# Injected\n## heading";
  s.threads[0].body = "```\n# Not a heading\n```\n";
  const out = buildReviewPacket(s, s.threads[0].id);
  const lines = out.split("\n");
  assert.ok(!lines.some((l) => /^#{1,6} Injected/.test(l)));
  assert.ok(lines.some((l) => l.startsWith("````")));
  assert.ok(!lines.some((l) => l === "# Not a heading" && lines.indexOf(l) < lines.findIndex((x) => x.startsWith("````"))));
});

test("evidence deep links round-trip through the router", () => {
  for (const e of buildLedger(createSeed())) {
    const hash = buildHash("thread", e.threadId, { post: e.postId });
    assert.equal(hash, `#/thread/${e.threadId}?post=${e.postId}`);
    const r = parseHash(hash);
    assert.equal(r.name, "thread");
    assert.equal(r.params.id, e.threadId);
    assert.equal(r.query.post, e.postId);
  }
  assert.equal(buildHash("thread", "t2", { post: "t2-p3" }), "#/thread/t2?post=t2-p3");
});
