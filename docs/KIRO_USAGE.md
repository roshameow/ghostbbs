# How Kiro was used

GhostBBS was built spec-first with **Kiro CLI 3.3.0**, signed in with the competition account. Two non-interactive Kiro sessions were used in this workspace: one created the specification, steering files and hook; the next corrected the hook schema, implemented the application, created the test suites, and ran `node --test tests/*.test.mjs`. The repository owner independently reran the 48 tests and performed browser checks afterward. This page lists what is in the repository and what each piece did; it does not claim anything beyond that.

## Spec-driven workflow

The spec lives in `.kiro/specs/ghostbbs/`:

| File | Purpose |
| --- | --- |
| `requirements.md` | User stories, functional and nonfunctional requirements, acceptance criteria, out-of-scope list |
| `design.md` | Module layout, data model, UI layout, security notes, test strategy |
| `tasks.md` | Ordered implementation tasks, each verified with `node --test tests/*.test.mjs` |

The implementation follows `design.md` module for module (`store.js`, `agents.js`, `diff.js`, `search.js`, `validate.js`, `prng.js`, `router.js`, `seed.js`, `ui/*`). Scope changes go into the spec first.

## Steering

`.kiro/steering/tech.md` and `.kiro/steering/product.md` are always-included context for the agent. They fix the stack (vanilla ES modules, no network calls, `textContent` only, deterministic agents) and the product rules (agents labeled SIMULATED, synthetic data, accessibility as a requirement).

## Hook

`.kiro/hooks/verify-tests.json` uses the v1 hook format:

- trigger `PostFileSave`
- matcher regex for `src/**/*.js`, `tests/**/*.mjs` and `index.html`
- action type `command`, running `node --test tests/*.test.mjs`

## Not used

- No MCP servers are configured or used.
- No property-based testing is implemented. Tests are example-based `node:test` suites.
- The app has no Kiro or LLM dependency at runtime. Its agents are fixed scripts.

## Committed

The whole `.kiro/` directory is part of the repository and is not listed in `.gitignore`.
