# GhostBBS Tasks

Verify command after each code task: `node --test tests/*.test.mjs`

- [x] 1. Scaffold `index.html` (CSP meta, landmarks, live region), `css/ghostbbs.css`, `src/` and `tests/` folders.
  - Evidence: `index.html`, `css/ghostbbs.css`, `src/`, `tests/` exist; `tests/static.test.mjs` checks CSP, landmarks, live region, no inline code.
- [x] 2. Implement `prng.js` and `validate.js` with tests.
  - Evidence: `src/prng.js`, `src/validate.js`; `tests/validate.test.mjs` (8 tests), PRNG test in `tests/agents.test.mjs`.
- [x] 3. Write synthetic `seed.js` (4 boards, 4 simulated agents, about 8 threads covering every post kind) and test that it validates.
  - Evidence: `src/seed.js`; "seed state validates and covers every post kind" in `tests/validate.test.mjs`.
- [x] 4. Implement `store.js` (load, save, migrate fallback, mutations, reset, export, import) with tests using a fake storage.
  - Evidence: `src/store.js`; `tests/store.test.mjs` (14 tests) using a fake/memory storage.
- [x] 5. Implement `diff.js` and `search.js` with tests.
  - Evidence: `src/diff.js`, `src/search.js`; `tests/diff.test.mjs` (3), `tests/search.test.mjs` (6).
- [x] 6. Implement `agents.js` deterministic scripts with tests for reproducibility and the simulated flag.
  - Evidence: `src/agents.js`; `tests/agents.test.mjs` (8) covers reproducibility, script order and the simulated flag.
- [x] 7. Build `ui/dom.js` (no innerHTML) and `ui/components.js` (badges, diff view, verification record).
  - Evidence: `src/ui/dom.js`, `src/ui/components.js`; `tests/static.test.mjs` forbids `innerHTML`. No DOM unit tests.
- [x] 8. Build `router.js` and screens: menu, boards, thread list, thread view, new thread, search, roster, about.
  - Evidence: `src/router.js`, `src/ui/screens.js`; routing and shortcut tests in `tests/static.test.mjs`. Screens checked by hand only.
- [x] 9. Wire `main.js`: Run agents, reply, status change, export, import, reset, theme toggle, live announcements.
  - Evidence: `src/main.js` (actions, shortcuts, announcements). Store actions covered in `tests/store.test.mjs`; UI wiring checked by hand only.
- [x] 10. Apply retro styling, high-contrast mode, focus styles, reduced-motion support.
  - Evidence: `css/ghostbbs.css`; high-contrast toggle and focus styles checked by hand on the static HTTP server.
- [x] 11. Add static safety test (no remote URLs, `fetch`, `innerHTML`, `eval`, key-like strings).
  - Evidence: `tests/static.test.mjs` (9 tests: remote URLs, `fetch`, `innerHTML`, `eval`, key-like strings, inline scripts).
- [x] 12. Manual pass: keyboard only, offline from `file://`, reload persistence, malformed import.
  - Evidence: done on the static HTTP server only (`python3 -m http.server`): keyboard-only use, reload persistence, malformed-import rejection, high-contrast mode, performed by the repository owner. Not verified across all browsers from `file://`: Chrome blocks ES modules on `file://`, a documented browser limitation (README, Limitations).
- [x] 13. Write README (what it is, simulated-agents disclosure, run instructions, Kiro usage) and confirm `.kiro/` is committed.
  - Evidence: `README.md` has the SIMULATED disclosure, run instructions and Kiro usage link; `tests/static.test.mjs` checks the disclosure and that `.kiro` is not ignored.
- [x] 14. Add the Evidence Ledger (FR-15): `src/ledger.js`, `ledgerScreen`, route `#/ledger`, shortcut `L`, nav link, result filter, tests.
  - Evidence: `src/ledger.js`, `src/ui/screens.js`, `src/router.js`, `src/main.js`, `index.html`; `tests/ledger.test.mjs` (8 tests). Screen checked by code review only; not yet checked by hand in a browser.
- [x] 15. Add review packet export (FR-16): `src/review-packet.js`, thread-screen button, `actions.exportReviewPacket`.
  - Evidence: `src/review-packet.js`, `src/main.js`, `src/ui/screens.js`; `tests/review-packet.test.mjs` (disclosures, single-thread scope, diff/verification/system posts, determinism, no mutation, missing thread, fence safety). Button and download checked by code review only, not yet in a browser.
- [x] 16. Add ledger evidence deep links (FR-17): link in `ledgerScreen`, `focusPostTarget` in `src/main.js`, `.post-target` CSS.
  - Evidence: `src/ui/screens.js`, `src/main.js`, `css/ghostbbs.css`; deep-link hash round-trip test in `tests/review-packet.test.mjs`. Focus and scroll behavior checked by code review only, not yet in a browser.

Final result: `node --test tests/*.test.mjs` reports 64 tests, 64 pass, 0 fail (48 original, 8 ledger, 8 review packet and deep link). The earlier result was 48 of 48.
