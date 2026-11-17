import test from "node:test";
import assert from "node:assert/strict";
import {
  createStore, createMemoryStorage, createSafeStorage, loadState, STORAGE_KEY,
} from "../src/store.js";
import { createSeed } from "../src/seed.js";

const fixedNow = () => "2026-06-01T12:00:00.000Z";
const make = (storage = createMemoryStorage()) => ({ storage, store: createStore(storage, { now: fixedNow }) });

test("empty storage loads the seed", () => {
  const { store } = make();
  assert.equal(store.getStatus().source, "seed");
  assert.equal(store.getState().threads.length, createSeed().threads.length);
});

test("corrupt JSON falls back to seed without throwing", () => {
  const storage = createMemoryStorage();
  storage.setItem(STORAGE_KEY, "{not json");
  const r = loadState(storage);
  assert.equal(r.source, "fallback");
  assert.equal(r.state.schemaVersion, 1);
});

test("unknown schema version falls back to seed", () => {
  const storage = createMemoryStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify({ ...createSeed(), schemaVersion: 99 }));
  assert.equal(loadState(storage).source, "fallback");
});

test("throwing storage does not crash load or save", () => {
  const bad = {
    getItem() { throw new Error("denied"); },
    setItem() { throw new Error("denied"); },
    removeItem() {},
  };
  const store = createStore(bad, { now: fixedNow });
  assert.equal(store.getStatus().source, "fallback");
  const r = store.createThread({ boardId: "bugs", title: "T", body: "B" });
  assert.equal(r.ok, true);
  assert.equal(store.getStatus().persisted, false);
});

test("createSafeStorage falls back to memory", () => {
  const r = createSafeStorage(() => { throw new Error("no storage"); });
  assert.equal(r.persistent, false);
  r.storage.setItem("a", "1");
  assert.equal(r.storage.getItem("a"), "1");
  const ok = createSafeStorage(() => createMemoryStorage());
  assert.equal(ok.persistent, true);
});

test("createThread persists and survives reload", () => {
  const { storage, store } = make();
  const r = store.createThread({ boardId: "features", title: "  Add thing ", body: "Please", author: "" });
  assert.equal(r.ok, true);
  const t = store.getState().threads.find((x) => x.id === r.id);
  assert.equal(t.title, "Add thing");
  assert.equal(t.author, "guest");
  assert.equal(t.status, "open");
  const reloaded = createStore(storage, { now: fixedNow });
  assert.equal(reloaded.getStatus().source, "saved");
  assert.ok(reloaded.getState().threads.some((x) => x.id === r.id));
});

test("createThread rejects invalid input and leaves state untouched", () => {
  const { store } = make();
  const before = store.getState().threads.length;
  const r = store.createThread({ boardId: "nope", title: "", body: "" });
  assert.equal(r.ok, false);
  assert.ok(r.errors.length > 0);
  assert.equal(store.getState().threads.length, before);
});

test("addPost appends a human message", () => {
  const { store } = make();
  const { id } = store.createThread({ boardId: "bugs", title: "T", body: "B" });
  assert.equal(store.addPost(id, { body: "hello" }).ok, true);
  const t = store.getState().threads.find((x) => x.id === id);
  assert.equal(t.posts.length, 1);
  assert.equal(t.posts[0].authorId, "human");
  assert.equal(store.addPost(id, { body: " " }).ok, false);
  assert.equal(store.addPost("missing", { body: "x" }).ok, false);
});

test("setStatus records a system post and rejects bad values", () => {
  const { store } = make();
  const { id } = store.createThread({ boardId: "bugs", title: "T", body: "B" });
  assert.equal(store.setStatus(id, "blocked").ok, true);
  const t = store.getState().threads.find((x) => x.id === id);
  assert.equal(t.status, "blocked");
  assert.equal(t.posts.at(-1).kind, "system");
  assert.match(t.posts.at(-1).body, /open to blocked/);
  assert.equal(store.setStatus(id, "weird").ok, false);
  const n = t.posts.length;
  store.setStatus(id, "blocked");
  assert.equal(store.getState().threads.find((x) => x.id === id).posts.length, n);
});

test("runAgents adds scripted posts once and updates status", () => {
  const { store } = make();
  const { id } = store.createThread({ boardId: "bugs", title: "T", body: "B" });
  const r = store.runAgents(id);
  assert.equal(r.ok, true);
  assert.equal(r.added, 4);
  const t = store.getState().threads.find((x) => x.id === id);
  assert.deepEqual(
    t.posts.filter((p) => p.kind !== "system").map((p) => p.kind),
    ["progress", "diff", "progress", "verification"],
  );
  assert.ok(["verified", "blocked"].includes(t.status));
  assert.equal(store.runAgents(id).ok, false);
});

test("runAgents refuses closed threads", () => {
  const { store } = make();
  const { id } = store.createThread({ boardId: "bugs", title: "T", body: "B" });
  store.setStatus(id, "closed");
  assert.equal(store.runAgents(id).ok, false);
});

test("reset restores the seed", () => {
  const { store } = make();
  store.createThread({ boardId: "bugs", title: "T", body: "B" });
  store.reset();
  assert.equal(store.getState().threads.length, createSeed().threads.length);
});

test("export then import round-trips", () => {
  const a = make();
  a.store.createThread({ boardId: "bugs", title: "Round trip", body: "B" });
  const json = a.store.exportJson();
  const b = make();
  assert.equal(b.store.importJson(json).ok, true);
  assert.ok(b.store.getState().threads.some((t) => t.title === "Round trip"));
});

test("invalid import is rejected and state is unchanged", () => {
  const { store } = make();
  const before = store.exportJson();
  const r = store.importJson('{"schemaVersion":1}');
  assert.equal(r.ok, false);
  assert.ok(r.errors.length > 0);
  assert.equal(store.exportJson(), before);
  assert.equal(store.importJson("garbage").ok, false);
});
