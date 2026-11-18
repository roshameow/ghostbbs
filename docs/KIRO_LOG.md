# Kiro build log

A short trace of how GhostBBS was built. It lists only facts verifiable from the repository, recorded local session logs and the public test run. Prompts below are abridged and sanitized excerpts; no credentials, account IDs, private paths or private research data are included.

- Tool: Kiro CLI 3.3.0 for sessions 1-3. The exact CLI version was not recorded for sessions 4-5.
- Sessions: five non-interactive Kiro sessions (spec, implementation, documentation, ledger feature, review-packet/deep-link feature).
- Repository owner: ran independent tests and browser checks, created public URLs, and submitted the project.

## Session 1 - specification, steering and hook

Objective excerpt:

> "Create the spec, steering and hook files and no application implementation yet."

Outputs: `.kiro/specs/ghostbbs/{requirements,design,tasks}.md`, `.kiro/steering/{product,tech}.md`, `.kiro/hooks/verify-tests.json`.

## Session 2 - implementation and first test suite

Objective excerpt:

> "Fix the Kiro hook schema first using the official current format ... Then implement the complete GhostBBS app from the approved spec."

Outputs: `index.html`, `css/ghostbbs.css`, `src/`, `tests/`, `README.md`, `LICENSE`, `docs/KIRO_USAGE.md`. The first hook draft had an invalid schema and was corrected to version v1 with trigger `PostFileSave` and command `node --test tests/*.test.mjs`.

Result: 48 tests, 48 pass, 0 fail.

## Session 3 - evidence documentation

Objective excerpt:

> "Revise `.kiro/specs/ghostbbs/tasks.md` so completed items are checked and each item has a short factual evidence note ... Expand `docs/KIRO_USAGE.md` into an evidence-oriented page ... Create `docs/KIRO_LOG.md`."

Outputs: checked task evidence, FR-to-source/test mapping, build trace. No application code was changed.

## Session 4 - Evidence Ledger

Objective excerpt:

> "Add a local-first Evidence Ledger that demonstrates the abstract error-ledger pattern: collect verification events from all threads, keep each event append-only, derive PASS / FAIL / UNKNOWN, and expose evidence references without claiming root cause."

Outputs: `src/ledger.js`, `tests/ledger.test.mjs`, `ledgerScreen`, route `#/ledger`, shortcut `L`, updated spec/docs. The persisted state schema was unchanged.

Result: 56 tests, 56 pass, 0 fail.

## Session 5 - review packet and evidence deep links

Objective excerpts:

> "Add pure module `src/review-packet.js` exporting `buildReviewPacket(state, threadId)` returning a deterministic Markdown string."

> "Make each Evidence Ledger evidence reference a link to the exact source post ... focus it and scroll it into view."

Outputs: `src/review-packet.js`, `tests/review-packet.test.mjs`, thread-screen export button, `#/thread/<id>?post=<postId>` deep links, `.post-target` styling, FR-16/FR-17 spec updates and docs. The persisted state schema was unchanged.

Result: 64 tests, 64 pass, 0 fail.

## Independent verification

- Repository owner reran `node --test tests/*.test.mjs`: 64/64 pass.
- Browser checks on the public site confirmed: no page errors, ledger filters, evidence deep-link focus/scroll, and review-packet Markdown download.
- GitHub Actions workflow `.github/workflows/test.yml` ran successfully on push (`tests`, main, run `44228599428`).
- Full prompts, timestamps and local log paths are intentionally not published.

## Local commits

- `916551b` Build GhostBBS static BBS demo with Kiro CLI
- `43bebf2` Document live demo URL
- `680b6c6` Add evidence ledger and traceable Kiro workflow
- `6b0314f` Add review packet and evidence deep links
- `037b1b9` Add GitHub Actions workflow for Node tests
