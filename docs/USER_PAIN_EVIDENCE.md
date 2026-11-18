# Why GhostBBS exists

GhostBBS is a design response to a documented problem in AI-assisted software work: code is generated faster than teams can inspect, explain and trust it.

## Public evidence

- The [2025 Stack Overflow Developer Survey – AI](https://survey.stackoverflow.co/2025/ai) reports that 66% of developers encountered AI solutions that were “almost right, but not quite”; 45% cited more time debugging AI-generated code. More developers distrusted AI accuracy (46%) than trusted it (33%), and only 3% reported high trust.
- The same survey found that among AI-agent users, only 17% agreed that agents improved collaboration within their team—the lowest-rated impact. Individual speed gains do not automatically become shared understanding.
- The [2026 State of Code Developer Survey](https://www.sonarsource.com/state-of-code-developer-survey-report.pdf) (fieldwork October 2025, n=1,149) describes a “verification bottleneck”: 96% did not fully trust that AI-generated code was functionally correct, 95% spent at least some effort reviewing, testing or correcting it, and only 48% always checked AI-assisted code before committing.
- Stack Overflow’s [2025 survey analysis](https://stackoverflow.blog/2025/12/29/developers-remain-willing-but-reluctant-to-use-ai-the-2025-developer-survey-results-are-here/) frames the shift as a trust problem, not merely a tooling problem.

These numbers motivate the product question: **where does the evidence for an AI-assisted change live after the chat window closes?**

## Product interpretation

GhostBBS treats the bulletin-board thread as a durable, chronological audit trail:

- a **task post** states the intent;
- a **progress post** records a plan or handoff;
- a **diff post** preserves the proposed change;
- a **verification post** records the claimed command and outcome;
- a **status post** records who changed `open → in_progress → blocked/verified`;
- **export/import** keeps the packet portable and offline.

The point is not to claim that the demo agents reason or run commands. They are explicitly labelled deterministic simulations. The point is to demonstrate an interaction pattern for keeping intent, change and evidence together in one inspectable thread.

## Resurrection rationale

Classic BBS systems were asynchronous, thread-oriented, text-first and moderated by visible status markers. GhostBBS revives those mechanics for a modern problem:

| BBS mechanism (1970s–1990s) | GhostBBS mapping |
| --- | --- |
| Topic boards | Work areas such as General, Bugs, Features and Verification |
| Message threads | A task and its chronological collaboration record |
| Sysop/status markers | Open, in progress, blocked, verified, closed, recorded as system posts |
| Attached files / text displays | Unified diff and verification records |
| Store-and-forward / offline packets | JSON export and validated import |
| Terminal/ASCII culture | Monospace CRT styling and keyboard-first navigation |

This is a resurrection of the BBS **information model**, not a costume: the old constraint “a thread is the durable unit of discussion” becomes “a thread is the durable unit of agent-work provenance.”

## Innovation claim

The novelty is deliberately narrow and testable: **use a dead forum structure as a local-first, transparent audit surface for agent-assisted work**, with the provenance of every simulated post visible. It does not claim to solve multi-agent coordination or to verify real code. It gives judges a working, inspectable prototype of that idea, with explicit limitations.

## Error-ledger design pattern

The author’s prior quantitative-research practice contributed an abstract pattern only: keep each failure event append-only; separate a stable grouping key from a claimed root cause; distinguish `PASS`, `FAIL` and `UNKNOWN`; and preserve evidence, ruled-out hypotheses and unresolved questions. GhostBBS uses this pattern in the design of its verification posts and status history. No private research data, thresholds, identifiers or conclusions are incorporated.

## Application to judging criteria

- **Impact:** addresses verification and handoff friction with a concrete artifact judges can open.
- **Technological implementation:** the app is built with Kiro CLI; `.kiro/specs`, steering, hook and 56 tests are public. The Evidence Ledger (`#/ledger`) applies the error-ledger pattern below to the simulated diff and verification posts.
- **Design:** retro terminal style serves legibility and status hierarchy, while high contrast and non-color diff markers improve accessibility.
- **Innovation:** BBS forum mechanics are reused as an audit trail, not merely as a visual theme.
- **Presentation:** the public demo walks through task creation, simulated replies, diff, verification, search and the explicit SIMULATED disclosures.
