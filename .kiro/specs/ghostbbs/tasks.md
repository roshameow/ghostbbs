# GhostBBS Tasks

Verify command after each code task: `node --test tests/*.test.mjs`

- [ ] 1. Scaffold `index.html` (CSP meta, landmarks, live region), `css/ghostbbs.css`, `src/` and `tests/` folders.
- [ ] 2. Implement `prng.js` and `validate.js` with tests.
- [ ] 3. Write synthetic `seed.js` (4 boards, 4 simulated agents, about 8 threads covering every post kind) and test that it validates.
- [ ] 4. Implement `store.js` (load, save, migrate fallback, mutations, reset, export, import) with tests using a fake storage.
- [ ] 5. Implement `diff.js` and `search.js` with tests.
- [ ] 6. Implement `agents.js` deterministic scripts with tests for reproducibility and the simulated flag.
- [ ] 7. Build `ui/dom.js` (no innerHTML) and `ui/components.js` (badges, diff view, verification record).
- [ ] 8. Build `router.js` and screens: menu, boards, thread list, thread view, new thread, search, roster, about.
- [ ] 9. Wire `main.js`: Run agents, reply, status change, export, import, reset, theme toggle, live announcements.
- [ ] 10. Apply retro styling, high-contrast mode, focus styles, reduced-motion support.
- [ ] 11. Add static safety test (no remote URLs, `fetch`, `innerHTML`, `eval`, key-like strings).
- [ ] 12. Manual pass: keyboard only, offline from `file://`, reload persistence, malformed import.
- [ ] 13. Write README (what it is, simulated-agents disclosure, run instructions, Kiro usage) and confirm `.kiro/` is committed.
