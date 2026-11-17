# GhostBBS Tech Guidance

- Stack: static vanilla HTML, CSS and ES modules. No framework, bundler, or npm runtime dependencies.
- No external runtime calls: no CDNs, web fonts, analytics, remote images, `fetch` or XHR. The app must work from `file://` and offline.
- State in `localStorage` under `ghostbbs:v1` with a schema version. Validate on load and import; fall back to seed data on failure.
- Keep logic in pure modules without DOM access so `node --test` can cover them. Inject the storage adapter.
- Render user text with `textContent` only. No `innerHTML`, `eval`, or inline scripts. Keep the CSP meta tag strict.
- Agents are deterministic: use the seeded PRNG and a logical clock, never `Math.random()` or `Date.now()` inside agent logic.
- No secrets: no keys, tokens, or credentials in code, data, config, or logs.
- Tests: `node --test tests/*.test.mjs` (Node built-in runner, test files named `*.test.mjs`).
- The root `.kiro/` directory (specs, steering, hooks) is committed. Do not gitignore it.
- Follow the module layout in `.kiro/specs/ghostbbs/design.md`.
