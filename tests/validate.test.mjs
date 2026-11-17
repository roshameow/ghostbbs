import test from "node:test";
import assert from "node:assert/strict";
import { validateState, parseImport, validateThreadInput, validatePostInput, LIMITS } from "../src/validate.js";
import { createSeed } from "../src/seed.js";

test("seed state validates and covers every post kind", () => {
  const seed = createSeed();
  const r = validateState(seed);
  assert.deepEqual(r.errors, []);
  assert.equal(r.ok, true);
  assert.equal(seed.boards.length, 4);
  assert.ok(seed.agents.length >= 4);
  assert.ok(seed.agents.every((a) => a.simulated === true));
  const kinds = new Set(seed.threads.flatMap((t) => t.posts.map((p) => p.kind)));
  for (const k of ["message", "progress", "diff", "verification", "system"]) assert.ok(kinds.has(k), k);
});

test("rejects non-objects and wrong schema version", () => {
  assert.equal(validateState(null).ok, false);
  assert.equal(validateState([]).ok, false);
  const s = createSeed();
  s.schemaVersion = 2;
  assert.equal(validateState(s).ok, false);
});

test("rejects bad enums", () => {
  const a = createSeed();
  a.threads[0].status = "done";
  assert.equal(validateState(a).ok, false);
  const b = createSeed();
  b.agents[0].role = "wizard";
  assert.equal(validateState(b).ok, false);
  const c = createSeed();
  c.threads[0].posts[0].kind = "rant";
  assert.equal(validateState(c).ok, false);
});

test("rejects duplicate ids and unknown references", () => {
  const a = createSeed();
  a.threads[1].id = a.threads[0].id;
  assert.equal(validateState(a).ok, false);
  const b = createSeed();
  b.threads[0].boardId = "nope";
  assert.equal(validateState(b).ok, false);
  const c = createSeed();
  c.threads[0].posts[0].authorId = "ghost";
  assert.equal(validateState(c).ok, false);
});

test("rejects non-simulated agents and verification records", () => {
  const a = createSeed();
  a.agents[0].simulated = false;
  assert.equal(validateState(a).ok, false);
  const b = createSeed();
  const post = b.threads.flatMap((t) => t.posts).find((p) => p.kind === "verification");
  post.verification.simulated = false;
  assert.equal(validateState(b).ok, false);
});

test("rejects oversized data", () => {
  const s = createSeed();
  const t = s.threads[0];
  s.threads = Array.from({ length: LIMITS.maxThreads + 1 }, (_, i) => ({ ...t, id: `x${i}`, posts: [] }));
  assert.equal(validateState(s).ok, false);
  assert.equal(parseImport("x".repeat(LIMITS.maxImportChars + 1)).ok, false);
});

test("parseImport handles bad JSON and good JSON", () => {
  assert.equal(parseImport("{nope").ok, false);
  assert.equal(parseImport("{}").ok, false);
  const good = parseImport(JSON.stringify(createSeed()));
  assert.equal(good.ok, true);
  assert.equal(good.state.schemaVersion, 1);
});

test("input validators", () => {
  const s = createSeed();
  assert.ok(validateThreadInput(s, { boardId: "x", title: "", body: "" }).length >= 3);
  assert.deepEqual(validateThreadInput(s, { boardId: "bugs", title: "T", body: "B" }), []);
  assert.equal(validatePostInput({ body: "   " }).length, 1);
  assert.deepEqual(validatePostInput({ body: "hi" }), []);
});
