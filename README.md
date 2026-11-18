# GhostBBS

A retro bulletin board system for AI coding agent collaboration: task threads, progress replies, code diffs and verification records. It is a static web app: vanilla HTML, CSS and ES modules, no build step, no dependencies.

## Live demo

[![tests](https://github.com/roshameow/ghostbbs/actions/workflows/test.yml/badge.svg)](https://github.com/roshameow/ghostbbs/actions/workflows/test.yml)

Application URL: <https://roshameow.github.io/ghostbbs/>

## SIMULATED agents: read this first

Every agent in GhostBBS is a **SIMULATED**, deterministic script. They are not AI models.

- They do not reason about your task, write real code, or run commands.
- Diffs are illustrative text picked from a small built-in set by a seeded PRNG.
- Verification records are illustrative data. The app never executes anything.
- Output is reproducible: same thread state and seed give the same posts.
- Seed data is synthetic. Handles and projects are fictional.

The UI labels these agents `[SIMULATED]` in the banner, the roster, every agent post and the About page.

## Run it

No network access is needed or used.

**Static server (recommended):**

```
python3 -m http.server 8000
```

Then open http://localhost:8000/ in a browser.

**Directly from `file://`:** open `index.html`. Firefox and Safari generally allow module scripts from local files. Chrome and Edge block ES modules loaded from `file://`, so use the static server there. This is a browser rule and not something the app can work around without a build step.

## Controls

| Key | Action |
| --- | --- |
| M | Main menu |
| B | Boards |
| N | New thread |
| S | Search |
| A | Agent roster |
| L | Evidence ledger |
| ? | About |
| T | Toggle high contrast |

Shortcuts are disabled while typing in a field, and when Ctrl, Alt or Cmd is held.

In a thread: change status with the Status selector (recorded as a system post), add a human reply, or press **Run agents (SIMULATED)** to add the scripted planner, coder, reviewer and verifier posts, including a diff and a verification record.

**Evidence ledger** (`#/ledger`, key L): lists every diff and verification post across all threads, oldest first, with a result filter (All, PASS, FAIL, UNKNOWN). Entries are SIMULATED. UNKNOWN means no verification evidence is present. Entries on one thread are not evidence of a common root cause. The ledger is derived from existing posts and adds nothing to stored data.

**Evidence deep links**: each ledger reference links to the exact post (`#/thread/t2?post=t2-p3`). The target post is outlined, labelled, focused and scrolled into view.

**Export review packet** (thread screen button): downloads `ghostbbs-review-<thread id>.md`, a Markdown summary of that one thread with a SIMULATED disclosure, all posts, diffs, verification records and a thread ledger. Nothing is run or sent anywhere.

Footer: **Export JSON**, **Import JSON** (validated, 5 MB limit, bad files are rejected with a message), **Reset to seed** (asks for confirmation). The header has a high-contrast toggle.

Data lives in `localStorage` under `ghostbbs:v1` (state) and `ghostbbs:v1:prefs` (theme). If storage is unavailable, the app keeps data in memory for the session.

## Testing

```
node --test tests/*.test.mjs
```

Uses the Node built-in runner (Node 18 or newer; developed on Node 23). Tests cover store, ledger, review packet, agents, diff, search, validation, routing and static safety checks (no remote URLs, `fetch`, HTML injection APIs, `eval`, key-like strings, inline scripts). The DOM layer is not unit-tested; see the manual checklist in `.kiro/specs/ghostbbs/design.md`.

## Structure

```
index.html            CSP, landmarks, live region, data controls
css/ghostbbs.css      retro theme, high contrast, responsive
src/main.js           bootstrap, actions, shortcuts
src/store.js          storage adapter, load/save, mutations
src/seed.js           synthetic seed data
src/agents.js         simulated roster and scripts
src/diff.js           unified diff parser
src/search.js         filtering and text search
src/ledger.js         evidence ledger derived from diff and verification posts
src/review-packet.js  Markdown review packet for one thread (pure)
src/validate.js       schema validation, limits
src/prng.js           seeded PRNG and logical clock
src/router.js         hash router, shortcut map
src/ui/               dom.js, components.js, screens.js
tests/                node:test suites (incl. ledger.test.mjs, review-packet.test.mjs)
docs/KIRO_USAGE.md    how Kiro was used
docs/KIRO_LOG.md      build trace
.kiro/                specs, steering, hooks (committed)
```

## More documentation

- [How Kiro was used](docs/KIRO_USAGE.md)
- [Kiro build log](docs/KIRO_LOG.md)
- [Why GhostBBS exists: user pain evidence](docs/USER_PAIN_EVIDENCE.md)

## Limitations

- Agents are scripts with four fixed steps per thread. They cannot respond to what you write.
- No real verification: pass or fail comes from the seeded script.
- Single browser, single user. No sync, accounts or backend.
- Chrome and Edge need an HTTP server for ES modules (see above).
- Browser UI is checked by hand, not by automated browser tests.
- Timestamps on human posts use the real clock; agent posts use a logical clock starting 2026-01-01.

## License

MIT, copyright 2026 Wen Liu. See `LICENSE`.
