// State store: load/save with an injected storage adapter, plus mutations.
// No DOM access. Mutations work on a clone and replace the state on success.

import { createSeed } from "./seed.js";
import { nextReplies, SCRIPT_LENGTH } from "./agents.js";
import { logicalTime } from "./prng.js";
import {
  validateState,
  parseImport,
  validateThreadInput,
  validatePostInput,
  STATUSES,
  LIMITS,
} from "./validate.js";

export const STORAGE_KEY = "ghostbbs:v1";

/** In-memory storage with the same shape as localStorage. */
export function createMemoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => void data.set(k, String(v)),
    removeItem: (k) => void data.delete(k),
  };
}

/**
 * Probe a candidate storage object (e.g. window.localStorage). Falls back to
 * memory storage if it is missing or throws. Returns { storage, persistent }.
 */
export function createSafeStorage(getCandidate) {
  try {
    const candidate = getCandidate();
    const probe = "ghostbbs:probe";
    candidate.setItem(probe, "1");
    candidate.removeItem(probe);
    return { storage: candidate, persistent: true };
  } catch {
    return { storage: createMemoryStorage(), persistent: false };
  }
}

/** Load state from storage. Returns { state, source: "seed"|"saved"|"fallback", errors }. */
export function loadState(storage) {
  let raw;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { state: createSeed(), source: "fallback", errors: ["Storage is unavailable."] };
  }
  if (raw === null || raw === undefined) return { state: createSeed(), source: "seed", errors: [] };
  if (typeof raw !== "string" || raw.length > LIMITS.maxImportChars) {
    return { state: createSeed(), source: "fallback", errors: ["Saved data is too large."] };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { state: createSeed(), source: "fallback", errors: ["Saved data was not valid JSON."] };
  }
  const result = validateState(parsed);
  if (!result.ok) return { state: createSeed(), source: "fallback", errors: result.errors };
  return { state: parsed, source: "saved", errors: [] };
}

/**
 * Create a store. `opts.now` supplies real timestamps for human content only.
 * Agent posts always use the logical clock.
 */
export function createStore(storage, opts = {}) {
  const now = opts.now || (() => new Date().toISOString());
  const loaded = loadState(storage);
  let state = loaded.state;
  const status = { source: loaded.source, loadErrors: loaded.errors, persisted: true };

  function persist() {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
      status.persisted = true;
    } catch {
      status.persisted = false;
    }
  }

  function commit(mutator) {
    const draft = structuredClone(state);
    const result = mutator(draft);
    if (result && result.ok === false) return result;
    state = draft;
    persist();
    return result || { ok: true };
  }

  function uniqueThreadId(draft) {
    let n = draft.clock;
    let id;
    do {
      n += 1;
      id = `t${n}`;
    } while (draft.threads.some((t) => t.id === id));
    draft.clock = n;
    return id;
  }

  function pushPost(thread, post) {
    thread.posts.push({ id: `${thread.id}-p${thread.posts.length + 1}`, ...post });
  }

  function applyStatus(draft, thread, newStatus, authorLabel, createdAt) {
    if (thread.status === newStatus) return;
    const old = thread.status;
    thread.status = newStatus;
    pushPost(thread, {
      authorId: "system",
      kind: "system",
      createdAt,
      body: `Status changed from ${old} to ${newStatus}${authorLabel ? ` by ${authorLabel}` : ""}.`,
    });
  }

  function cleanHandle(value) {
    const v = typeof value === "string" ? value.trim() : "";
    return v || "guest";
  }

  return {
    getState: () => state,
    getStatus: () => ({ ...status }),

    createThread(input) {
      const errors = validateThreadInput(state, input);
      if (errors.length) return { ok: false, errors };
      return commit((draft) => {
        const id = uniqueThreadId(draft);
        draft.threads.push({
          id,
          boardId: input.boardId,
          title: input.title.trim(),
          body: input.body.trim(),
          author: cleanHandle(input.author),
          status: "open",
          createdAt: now(),
          scriptStep: 0,
          posts: [],
        });
        return { ok: true, id };
      });
    },

    addPost(threadId, input) {
      const errors = validatePostInput(input);
      if (errors.length) return { ok: false, errors };
      return commit((draft) => {
        const thread = draft.threads.find((t) => t.id === threadId);
        if (!thread) return { ok: false, errors: ["Thread not found."] };
        if (thread.posts.length >= LIMITS.maxPosts) return { ok: false, errors: ["Post limit reached."] };
        pushPost(thread, { authorId: "human", kind: "message", createdAt: now(), body: input.body.trim() });
        return { ok: true };
      });
    },

    setStatus(threadId, newStatus) {
      if (!STATUSES.includes(newStatus)) return { ok: false, errors: ["Unknown status."] };
      return commit((draft) => {
        const thread = draft.threads.find((t) => t.id === threadId);
        if (!thread) return { ok: false, errors: ["Thread not found."] };
        if (thread.posts.length >= LIMITS.maxPosts) return { ok: false, errors: ["Post limit reached."] };
        applyStatus(draft, thread, newStatus, "you", now());
        return { ok: true };
      });
    },

    /** Add all remaining scripted simulated posts. Returns { ok, added }. */
    runAgents(threadId) {
      const thread0 = state.threads.find((t) => t.id === threadId);
      if (!thread0) return { ok: false, errors: ["Thread not found."] };
      if (thread0.status === "closed") return { ok: false, errors: ["Thread is closed. Reopen it first."] };
      if (thread0.scriptStep >= SCRIPT_LENGTH) {
        return { ok: false, errors: ["The simulated script for this thread is complete."] };
      }
      return commit((draft) => {
        const thread = draft.threads.find((t) => t.id === threadId);
        const drafts = nextReplies(thread, draft);
        if (thread.posts.length + drafts.length * 2 > LIMITS.maxPosts) {
          return { ok: false, errors: ["Post limit reached."] };
        }
        for (const d of drafts) {
          const { setStatus, ...fields } = d;
          pushPost(thread, { ...fields, createdAt: logicalTime(draft.clock++) });
          if (setStatus) applyStatus(draft, thread, setStatus, "", logicalTime(draft.clock++));
        }
        thread.scriptStep = SCRIPT_LENGTH;
        return { ok: true, added: drafts.length };
      });
    },

    reset() {
      state = createSeed();
      persist();
      return { ok: true };
    },

    exportJson() {
      return JSON.stringify(state, null, 2);
    },

    importJson(text) {
      const parsed = parseImport(text);
      if (!parsed.ok) return { ok: false, errors: parsed.errors };
      state = parsed.state;
      persist();
      return { ok: true };
    },
  };
}
