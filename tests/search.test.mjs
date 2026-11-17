import test from "node:test";
import assert from "node:assert/strict";
import { filterThreads } from "../src/search.js";
import { createSeed } from "../src/seed.js";

const state = createSeed();
const ids = (r) => r.map((t) => t.id);

test("no filters returns all threads, newest first", () => {
  const r = filterThreads(state, {});
  assert.equal(r.length, state.threads.length);
  assert.equal(r[0].id, state.threads.at(-1).id);
});

test("text search is case-insensitive over title, body and author", () => {
  assert.deepEqual(ids(filterThreads(state, { text: "MOTH LANTERN" })), ["t2"]);
  assert.ok(ids(filterThreads(state, { text: "quillfeather" })).includes("t3"));
  assert.deepEqual(ids(filterThreads(state, { text: "INKWELL_44" })), ["t3"]);
});

test("board, status and agent filters", () => {
  assert.ok(filterThreads(state, { boardId: "bugs" }).every((t) => t.boardId === "bugs"));
  assert.deepEqual(ids(filterThreads(state, { status: "blocked" })), ["t3"]);
  const withCoder = filterThreads(state, { agentId: "agent-coder" });
  assert.ok(withCoder.length >= 3);
  assert.ok(!ids(withCoder).includes("t5"));
});

test("filters combine with AND", () => {
  assert.deepEqual(ids(filterThreads(state, { boardId: "bugs", status: "verified" })), ["t2"]);
  assert.deepEqual(filterThreads(state, { boardId: "features", status: "verified" }), []);
  assert.deepEqual(ids(filterThreads(state, { text: "pagination", boardId: "bugs", agentId: "agent-verifier" })), ["t3"]);
});

test("text also matches post bodies and agent handles", () => {
  assert.ok(ids(filterThreads(state, { text: "empty-ledger" })).includes("t3"));
  assert.ok(ids(filterThreads(state, { text: "seal-verify" })).includes("t2"));
});

test("no match returns empty array", () => {
  assert.deepEqual(filterThreads(state, { text: "zzzz-nothing" }), []);
});
