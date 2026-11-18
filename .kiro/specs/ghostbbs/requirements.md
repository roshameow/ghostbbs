# GhostBBS Requirements

GhostBBS is a browser-based revival of classic bulletin board systems (BBS). AI coding agents collaborate through task threads, progress replies, code diffs and verification records. Category: Resurrection.

All built-in agents are deterministic simulations. They are not real AI models, and the UI must say so everywhere they appear.

## User Stories

1. As a visitor, I want to open the app offline and see a retro BBS main menu, so I can start without setup or accounts.
2. As a user, I want to browse boards (for example General, Bugs, Features, Verification), so I can find related task threads.
3. As a user, I want to create a task thread with a title, board, and description, so I can hand work to agents.
4. As a user, I want to read a thread as a chronological list of posts, so I can follow the collaboration.
5. As a user, I want simulated agents to post progress replies to a thread, so I can see how a team of agents would coordinate.
6. As a user, I want a reply to include a code diff rendered in unified format, so I can review proposed changes.
7. As a user, I want a verification record (command, result, timestamp, agent) attached to a thread, so I can see whether work was checked.
8. As a user, I want to change a thread's status (open, in progress, blocked, verified, closed), so I can track work.
9. As a user, I want to search and filter threads by board, status, agent and text, so I can find things quickly.
10. As a user, I want my data saved in the browser and a way to reset it to the seed data, so I can experiment safely.
11. As a user, I want to export and import my data as JSON, so I can back it up or share a demo.
12. As a keyboard or screen reader user, I want full access to every feature, so the app is usable without a mouse.
13. As a reviewer, I want one ledger of all diff and verification events with PASS, FAIL or UNKNOWN outcomes and references to the evidence, so I can see what has and has not been checked.
14. As a judge or reviewer, I want a clear "Simulated agents" notice and an About page, so I know what is real and what is not.

## Functional Requirements

- FR-1 Static app: `index.html`, CSS and ES modules only. No build step, no bundler, no server code.
- FR-2 Screens: main menu, board list, thread list (per board), thread view, new thread form, search, agent roster, about.
- FR-3 Thread model supports posts of kinds `message`, `progress`, `diff`, `verification`.
- FR-4 Simulated agents: a fixed roster of at least four agents with distinct roles (planner, coder, reviewer, verifier). Each has a `simulated: true` flag and a visible "SIMULATED" badge.
- FR-5 "Run agents" action on a thread advances a scripted, deterministic sequence of replies. Given the same thread state and seed, output is identical. No randomness without a seeded PRNG, and no network calls.
- FR-6 Diff posts store unified diff text and render added, removed and context lines with distinct styling plus a non-color marker (`+`, `-`).
- FR-7 Verification posts record the command text, `pass` or `fail`, and whether the result is `simulated`. The app never executes commands.
- FR-8 Thread status changes are recorded as system posts.
- FR-9 Search covers title, body, and author, case-insensitive, combined with board, status and agent filters.
- FR-10 Persistence uses `localStorage` under one namespaced key with a schema version. Corrupt or unknown-version data falls back to seed data without crashing.
- FR-11 Reset restores synthetic seed data after confirmation.
- FR-12 Export downloads JSON. Import validates structure and size, and rejects invalid files with a readable message.
- FR-13 Seed data is entirely synthetic: fictional handles, fictional projects, no real people or companies.
- FR-14 Retro presentation: monospace font, ANSI-style palette, optional ASCII art, with a high-contrast option.

- FR-15 Evidence ledger (route `#/ledger`, shortcut `L`, nav link `[L] Evidence ledger`): derived read-only from existing threads and posts, with no change to the persisted schema or validation enums. Each `diff` or `verification` post yields one entry (thread id and title, board, post id, author, kind, createdAt, diff filename, verification command/result/simulated, evidence reference). Outcome is PASS (passing verification), FAIL (failing verification) or UNKNOWN (diff with no following verification post). Entries are sorted by createdAt, then thread id, then post id. A result filter offers All, PASS, FAIL, UNKNOWN. The screen states that entries are SIMULATED, that UNKNOWN means no verification evidence is present, and that grouping does not prove a common root cause. The app asserts no root cause.
- FR-16 Review packet export: the thread screen has an "Export review packet" button. It downloads a deterministic Markdown file named `ghostbbs-review-<thread id>.md`, built by the pure function `buildReviewPacket(state, threadId)`. The packet has a factual title, a SIMULATED disclosure, board, status, author and created time, the original task, every post in chronological order (author, kind, timestamp, body), full unified diffs, verification command/result with "SIMULATED" and "no command was run", system status changes, an "Evidence ledger for this thread" summary from `buildLedger`, and the note that grouping does not prove a common root cause. User text is placed in fenced blocks (fence longer than any backtick run) or escaped on one line. A missing thread yields a short Markdown error. Success is announced in the live region. No schema change.
- FR-17 Evidence deep links: each ledger evidence reference links to `#/thread/<id>?post=<postId>` (built with `buildHash`). After rendering that route, the app looks up `#post-<postId>` by id only, adds the class `post-target` (outline, double left border and a text marker, so not color-only), sets `tabindex="-1"`, focuses it and scrolls it into view. An unknown post id is ignored. No HTML is injected.

## Nonfunctional Requirements

- NFR-1 Offline: works from `file://` or any static host with zero network requests at runtime. No CDNs, web fonts, analytics or remote images.
- NFR-2 Accessibility: WCAG 2.1 AA target. Semantic landmarks, visible focus, full keyboard operation, color never the sole signal, `prefers-reduced-motion` respected, live region for new replies, sufficient contrast.
- NFR-3 Privacy: no accounts, no telemetry, no cookies. Data stays in the browser.
- NFR-4 Security: all user text is rendered via `textContent` or escaped. No `innerHTML` with user data, no `eval`. Set a strict Content-Security-Policy meta tag (`default-src 'self'`). Imported JSON is validated and size-limited.
- NFR-5 Performance: first render under 1 second on a typical laptop with seed data. Handle at least 500 threads without noticeable lag.
- NFR-6 Portability: current Chrome, Firefox, Safari and Edge.
- NFR-7 Testability: pure logic modules (store, agents, search, diff, validation) have no DOM dependency and run under `node --test`.
- NFR-8 No secrets: no API keys, tokens or credentials in code, config or data.
- NFR-9 Repository: the root `.kiro` directory (specs, steering, hooks) is committed.

## Acceptance Criteria (summary)

- A fresh load shows seed data and a visible simulated-agents notice.
- Creating a thread, running agents, viewing a diff, and viewing a verification record all work offline and survive a reload.
- Reset, export and import behave as described, including rejection of malformed input.
- `node --test tests/*.test.mjs` passes.
- The app works with the keyboard alone.

## Out of Scope and Safety Notes

- No real LLM calls, no API keys, no backend, no user accounts, no multi-user sync.
- No execution of code, shell commands or tests from within the app. Verification records are data only and are labeled simulated.
- No claim that simulated agents reason, write real code, or verify real software. Seed diffs are illustrative.
- No real personal data, private documents, or real company names in seed data.
- No external network access at runtime, including fonts, icons and analytics.
- No dangerous or offensive content generation. Simulated agent scripts are fixed text.
