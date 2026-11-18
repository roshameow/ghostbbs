// Evidence ledger: a read-only view derived from existing threads and posts.
// Pure module, no DOM. Never mutates its input and never infers a root cause.

export const OUTCOMES = ["PASS", "FAIL", "UNKNOWN"];

/** Map a verification result to an outcome. Anything unrecognized is UNKNOWN. */
export function outcomeOfVerification(v) {
  if (v && v.result === "pass") return "PASS";
  if (v && v.result === "fail") return "FAIL";
  return "UNKNOWN";
}

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Stable evidence reference for a post, e.g. "#/thread/t2" plus post id. */
export function evidenceRef(threadId, postId) {
  return `${threadId}/${postId}`;
}

/**
 * Build ledger entries from every diff and verification post.
 * A verification entry takes its own result. A diff entry takes the result of
 * the next verification post in the same thread, or UNKNOWN if none follows.
 */
export function buildLedger(state) {
  const entries = [];
  const threads = state && Array.isArray(state.threads) ? state.threads : [];
  for (const t of threads) {
    const posts = Array.isArray(t.posts) ? t.posts : [];
    posts.forEach((p, i) => {
      if (!p || (p.kind !== "diff" && p.kind !== "verification")) return;
      const entry = {
        threadId: t.id,
        threadTitle: t.title,
        boardId: t.boardId,
        postId: p.id,
        authorId: p.authorId,
        kind: p.kind,
        createdAt: p.createdAt,
        ref: evidenceRef(t.id, p.id),
        outcome: "UNKNOWN",
      };
      if (p.kind === "diff") {
        entry.filename = p.diff ? p.diff.filename : undefined;
        const next = posts.slice(i + 1).find((q) => q && q.kind === "verification" && q.verification);
        if (next) {
          entry.outcome = outcomeOfVerification(next.verification);
          entry.evidencePostId = next.id;
        }
      } else if (p.verification) {
        entry.command = p.verification.command;
        entry.result = p.verification.result;
        entry.simulated = p.verification.simulated;
        entry.outcome = outcomeOfVerification(p.verification);
        entry.evidencePostId = p.id;
      }
      entries.push(entry);
    });
  }
  return entries.sort(
    (a, b) =>
      cmp(a.createdAt, b.createdAt) || cmp(a.threadId, b.threadId) || cmp(a.postId, b.postId),
  );
}

/** Count entries per outcome. */
export function summarizeLedger(entries) {
  const counts = { PASS: 0, FAIL: 0, UNKNOWN: 0 };
  for (const e of entries) counts[e.outcome] += 1;
  return counts;
}

/** Filter by outcome. "ALL", empty or unknown values return every entry. */
export function filterLedger(entries, outcome) {
  return OUTCOMES.includes(outcome) ? entries.filter((e) => e.outcome === outcome) : entries.slice();
}
