import test from "node:test";
import assert from "node:assert/strict";
import { ROSTER, nextReplies, SCRIPT_LENGTH, AGENT_IDS } from "../src/agents.js";
import { mulberry32, hashString, logicalTime } from "../src/prng.js";
import { createStore, createMemoryStorage } from "../src/store.js";
import { createSeed } from "../src/seed.js";
import { validateState } from "../src/validate.js";

test("roster has four distinct simulated roles", () => {
  assert.ok(ROSTER.length >= 4);
  assert.deepEqual(new Set(ROSTER.map((a) => a.role)), new Set(["planner", "coder", "reviewer", "verifier"]));
  assert.ok(ROSTER.every((a) => a.simulated === true));
});

test("prng is deterministic and in range", () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 20; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
  assert.notEqual(mulberry32(1)(), mulberry32(2)());
  assert.equal(hashString("abc"), hashString("abc"));
  assert.equal(logicalTime(0), "2026-01-01T09:00:00.000Z");
  assert.equal(logicalTime(60), "2026-01-01T10:00:00.000Z");
});

test("nextReplies is reproducible for the same input", () => {
  const state = createSeed();
  const thread = state.threads.find((t) => t.scriptStep === 0);
  const one = nextReplies(thread, state);
  const two = nextReplies(structuredClone(thread), structuredClone(state));
  assert.deepEqual(one, two);
  assert.equal(one.length, SCRIPT_LENGTH);
});

test("script order is planner, coder, reviewer, verifier", () => {
  const state = createSeed();
  const thread = state.threads.find((t) => t.scriptStep === 0);
  const drafts = nextReplies(thread, state);
  assert.deepEqual(drafts.map((d) => d.authorId), [AGENT_IDS.planner, AGENT_IDS.coder, AGENT_IDS.reviewer, AGENT_IDS.verifier]);
  assert.deepEqual(drafts.map((d) => d.kind), ["progress", "diff", "progress", "verification"]);
  assert.match(drafts[1].diff.unified, /^--- a\//);
  assert.equal(drafts[3].verification.simulated, true);
  assert.ok(["pass", "fail"].includes(drafts[3].verification.result));
});

test("script resumes from scriptStep and ends", () => {
  const state = createSeed();
  const thread = { ...state.threads.find((t) => t.scriptStep === 0), scriptStep: 3 };
  assert.equal(nextReplies(thread, state).length, 1);
  assert.deepEqual(nextReplies({ ...thread, scriptStep: SCRIPT_LENGTH }, state), []);
});

test("different seeds or thread ids may vary but each stays stable", () => {
  const state = createSeed();
  const thread = state.threads.find((t) => t.scriptStep === 0);
  const other = { ...state, seed: 99 };
  assert.deepEqual(nextReplies(thread, other), nextReplies(thread, other));
});

test("two independent stores produce identical agent output", () => {
  const run = () => {
    const store = createStore(createMemoryStorage(), { now: () => "2026-06-01T00:00:00.000Z" });
    store.runAgents("t5");
    return store.getState().threads.find((t) => t.id === "t5").posts;
  };
  assert.deepEqual(run(), run());
  const posts = run();
  assert.ok(posts.filter((p) => p.kind !== "system").every((p) => p.authorId.startsWith("agent-")));
});

test("state stays valid after running agents on every seed thread", () => {
  const store = createStore(createMemoryStorage());
  for (const t of store.getState().threads) store.runAgents(t.id);
  assert.equal(validateState(store.getState()).ok, true);
});
