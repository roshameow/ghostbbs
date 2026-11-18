# How Kiro was used

GhostBBS was built spec-first with **Kiro CLI 3.3.0**. Five Kiro sessions were used in this workspace. This page maps requirements to files and states what was and was not used. For a short timeline see [KIRO_LOG.md](KIRO_LOG.md).

## Sessions

1. Created the specification, steering files and the hook.
2. Corrected the hook schema, implemented the application, wrote the test suites and ran the tests.
3. Wrote the documentation.
4. Added the Evidence Ledger: spec update (FR-15, design, task 14), `src/ledger.js`, UI wiring and `tests/ledger.test.mjs`.
5. Added the review packet export (FR-16) and ledger evidence deep links (FR-17): spec, design and tasks update, `src/review-packet.js`, UI and CSS wiring, `tests/review-packet.test.mjs`. No persisted schema change.

## Spec-driven workflow

The spec lives in `.kiro/specs/ghostbbs/`: `requirements.md`, `design.md` and `tasks.md`. `tasks.md` has every task checked with an evidence note. The implementation follows the module layout in `design.md`.

## Steering

`.kiro/steering/tech.md` and `.kiro/steering/product.md` fix the stack (vanilla ES modules, no network calls, `textContent` only, deterministic agents) and the product rules (agents labeled SIMULATED, synthetic data, accessibility).

## Hook

`.kiro/hooks/verify-tests.json` was first written with an invalid schema. It was corrected to the v1 schema:

- `"version": "v1"`
- trigger `PostFileSave`
- matcher regex for `src/*.js`, `tests/*.mjs` and `index.html`
- action type `command`, running `node --test tests/*.test.mjs`

`tests/static.test.mjs` includes a test that the hook uses the v1 schema and the exact test command.

## Requirements to source and tests

| Requirement | Source | Tests |
| --- | --- | --- |
| FR-4 Simulated roster, four roles, SIMULATED badge | `src/agents.js`, `src/ui/components.js` | `tests/agents.test.mjs` (roster), `tests/validate.test.mjs` (rejects non-simulated agents) |
| FR-5 Deterministic Run agents | `src/agents.js`, `src/prng.js`, `src/store.js` | `tests/agents.test.mjs` (reproducible, script order, resume), `tests/store.test.mjs` (runAgents), `tests/static.test.mjs` (no `Math.random`/`Date.now` in agent logic) |
| FR-6 Diff posts with `+`/`-` markers | `src/diff.js`, `src/ui/components.js` | `tests/diff.test.mjs` |
| FR-7 Verification records, never executed | `src/agents.js`, `src/validate.js`, `src/ui/components.js` | `tests/validate.test.mjs` (rejects non-simulated records) |
| FR-8 Status change as system post | `src/store.js` | `tests/store.test.mjs` (setStatus) |
| FR-9 Search and filters | `src/search.js` | `tests/search.test.mjs` |
| FR-10 Namespaced, versioned persistence with fallback | `src/store.js` (`ghostbbs:v1`), `src/validate.js` | `tests/store.test.mjs` (empty, corrupt, unknown version, throwing storage, reload) |
| FR-15 Evidence ledger derived from posts, PASS/FAIL/UNKNOWN, no root-cause claim | `src/ledger.js`, `src/ui/screens.js`, `src/router.js` | `tests/ledger.test.mjs` |
| FR-16 Review packet export, SIMULATED disclosure, no root-cause claim | `src/review-packet.js`, `src/main.js`, `src/ui/screens.js` | `tests/review-packet.test.mjs` |
| FR-17 Evidence deep links to exact post | `src/ui/screens.js`, `src/main.js`, `css/ghostbbs.css`, `src/router.js` | `tests/review-packet.test.mjs` (hash round-trip); focus and scroll by code review only |
| FR-12 Export and validated import | `src/store.js`, `src/validate.js`, `src/main.js` | `tests/store.test.mjs` (round-trip, invalid import), `tests/validate.test.mjs` (oversized, parseImport) |

## Test result

Command: `node --test tests/*.test.mjs`

Result: 64 tests, 64 pass, 0 fail. Per file: agents 8, diff 3, ledger 8, review-packet 8, search 6, static 9, store 14, validate 8.

## Checked by the repository owner

The repository owner independently reran the tests and did the manual browser checks on the static HTTP server: keyboard-only use, reload persistence, malformed-import rejection and high-contrast mode. The repository owner also published the repository. Chrome blocks ES modules on `file://`, so `file://` operation is not verified in all browsers.

## Not used

- No MCP servers.
- No custom agents.
- No property-based testing. Tests are example-based `node:test` suites.
- No Kiro powers.
- No runtime LLM calls. The app's agents are fixed scripts.

## Committed

The whole `.kiro/` directory is committed and is not in `.gitignore`.
