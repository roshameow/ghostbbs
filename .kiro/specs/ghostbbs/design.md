# GhostBBS Design

## Architecture

Static, build-free vanilla app. ES modules loaded from `index.html`. State lives in memory and is persisted to `localStorage`. Logic modules are pure (no DOM) so Node can test them. UI modules are thin and render through a small DOM helper that uses `textContent`.

```
index.html
css/ghostbbs.css
src/
  main.js        bootstrap, router wiring, global key handling
  store.js       load/save/migrate/reset, state mutations (pure functions + storage adapter)
  seed.js        synthetic seed data
  agents.js      simulated agent roster and deterministic scripts
  diff.js        unified diff parsing into line objects
  search.js      filtering and text search
  validate.js    schema validation for import and loaded state
  prng.js        small seeded PRNG (mulberry32)
  router.js      hash router (#/boards, #/thread/:id)
  ui/
    dom.js       h() element helper, no innerHTML
    screens.js   menu, boards, thread list, thread view, forms, roster, about
    components.js badges, diff view, verification record, status select
tests/
  *.test.mjs     node:test unit tests
```

Storage adapter is injected (`{getItem,setItem,removeItem}`) so tests use an in-memory fake.

## Data Model

Stored under key `ghostbbs:v1`:

```
State {
  schemaVersion: 1,
  seed: number,                  // PRNG seed
  clock: number,                 // logical counter used for deterministic timestamps
  boards: Board[],
  agents: Agent[],
  threads: Thread[]
}
Board  { id, name, description }
Agent  { id, handle, role: "planner"|"coder"|"reviewer"|"verifier", simulated: true, bio }
Thread { id, boardId, title, body, author, status, createdAt, posts: Post[], scriptStep: number }
status: "open" | "in_progress" | "blocked" | "verified" | "closed"
Post {
  id, authorId, kind: "message"|"progress"|"diff"|"verification"|"system",
  createdAt, body,
  diff?: { filename, unified },
  verification?: { command, result: "pass"|"fail", simulated: true }
}
```

Timestamps are ISO strings derived from a fixed base date plus the logical clock, so agent output is reproducible. User-created content uses the real time for `createdAt` only in the store layer, never inside agent scripts.

## Modules

- store: `createStore(storage)` returns `{getState, createThread, addPost, setStatus, runAgents, reset, exportJson, importJson}`. Mutations return new state objects. Save after each mutation. On load failure, use seed.
- agents: `ROSTER` and `nextReplies(thread, state)` produce the next scripted posts from `scriptStep`. Every post authored by an agent is tagged by the UI with a SIMULATED badge.
- diff: `parseUnified(text)` returns `[{type:"add"|"del"|"ctx"|"hunk"|"meta", text}]`.
- search: `filterThreads(state, {text, boardId, status, agentId})`.
- validate: `validateState(obj)` returns `{ok, errors}`. Checks types, enums, id uniqueness, size limits (max 5 MB text, 2,000 threads, 500 posts per thread).
- router: hash-based routes so the app works from `file://`.

## UI Layout

Terminal-style single column, max width about 80 characters.

- Header: ASCII logo, persistent banner "Agents here are deterministic simulations, not real AI."
- Nav (landmark): Menu, Boards, Search, Agents, About, plus keyboard hints (single-letter shortcuts, disabled while typing in inputs).
- Main (landmark): current screen.
- Thread view: title, status control, post list (`<ol>`), each post with author, SIMULATED badge, kind label, timestamp. Diff posts in `<pre>` with `+`/`-` markers. Verification posts as a labeled definition list. Buttons: "Run agents", "Add reply".
- Footer: data controls (Export, Import, Reset), theme toggle (normal or high contrast).
- Live region (`aria-live="polite"`) announces new posts and status changes.

## Security and Privacy

CSP meta: `default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:`. No inline scripts. No network APIs used (`fetch`, `XMLHttpRequest` are absent). No identifiers beyond fictional handles.

## Test Strategy

Runner: `node --test tests/*.test.mjs` (Node built-in, no dependencies).

- store: load fallback on corrupt JSON, schema version mismatch, mutation persistence, reset.
- agents: same input gives identical output, script advances, all agents flagged simulated.
- diff: parse add/del/context/hunk lines.
- search: combined filters, case-insensitivity.
- validate: accepts seed, rejects bad enums, duplicates, oversized data.
- static checks: a test greps `index.html`, `src/` and `css/` for `http://`, `https://` (except in documented non-fetching text), `fetch(`, `innerHTML`, `eval(` and for key-like strings.
- manual checklist: keyboard-only pass, screen reader landmarks, offline load from `file://`, high-contrast mode, reload persistence.

## Hook

`.kiro/hooks/verify-tests.json` runs `node --test tests/*.test.mjs` when JS or HTML files are saved.
