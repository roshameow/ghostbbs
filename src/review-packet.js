// Review packet export: a deterministic Markdown summary of one thread.
// Pure module, no DOM, no network. Never mutates its input.
// Every agent in GhostBBS is a scripted simulation; the packet says so.

import { buildLedger, summarizeLedger } from "./ledger.js";

/** Collapse a user string to one line and escape Markdown punctuation. */
function inline(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/\s+/g, " ")
    .trim()
    .replace(/([\\`*\[\]<>|~&])/g, "\\$1")
    .replace(/(^|[^A-Za-z0-9])_|_(?![A-Za-z0-9])/g, (m) => m.replace("_", "\\_"));
}

/** Fence user text with a fence longer than any backtick run inside it. */
function fence(text, lang) {
  const s = String(text === undefined || text === null ? "" : text).replace(/\r\n?/g, "\n");
  const runs = s.match(/`+/g) || [];
  const len = Math.max(3, ...runs.map((r) => r.length + 1));
  const ticks = "`".repeat(len);
  return `${ticks}${lang || "text"}\n${s.replace(/\n$/, "")}\n${ticks}`;
}

function timeOf(iso) {
  return `${String(iso).replace("T", " ").slice(0, 16)} UTC`;
}

/** Build the Markdown review packet for one thread. */
export function buildReviewPacket(state, threadId) {
  const threads = state && Array.isArray(state.threads) ? state.threads : [];
  const thread = threads.find((t) => t && t.id === threadId);
  if (!thread) {
    return [
      "# Review packet unavailable",
      "",
      `No thread with id ${inline(threadId)} was found. It may have been removed or the id may be wrong.`,
      "",
    ].join("\n");
  }

  const agents = new Map((state.agents || []).map((a) => [a.id, a]));
  const board = (state.boards || []).find((b) => b.id === thread.boardId);
  const posts = (Array.isArray(thread.posts) ? thread.posts : [])
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p)
    .sort((a, b) => (a.p.createdAt < b.p.createdAt ? -1 : a.p.createdAt > b.p.createdAt ? 1 : a.i - b.i))
    .map(({ p }) => p);

  const authorOf = (id) => {
    const a = agents.get(id);
    if (a) return `${inline(a.handle)} (SIMULATED agent)`;
    return id === "human" ? "guest" : id === "system" ? "SYSTEM" : inline(id);
  };

  const out = [];
  out.push(`# Review packet: thread ${inline(thread.id)}`, "");
  out.push(`Thread title: ${inline(thread.title)}`, "");
  out.push(
    "> **SIMULATED.** GhostBBS agents are deterministic scripts. They do not reason, run code or run commands. Diffs and verification records below are illustrative data, not evidence that anything was executed or verified.",
    "",
  );
  out.push(
    `- Board: ${inline(board ? board.name : thread.boardId)}`,
    `- Status: ${inline(thread.status)}`,
    `- Author: ${inline(thread.author)}`,
    `- Created: ${timeOf(thread.createdAt)}`,
    `- Posts: ${posts.length}`,
    "",
  );
  out.push("## Original task", "", fence(thread.body), "");
  out.push("## Posts (chronological)", "");
  if (posts.length === 0) out.push("No replies.", "");

  posts.forEach((p, n) => {
    out.push(`### Post ${n + 1}: ${inline(p.id)}`, "");
    out.push(
      `- Author: ${authorOf(p.authorId)}`,
      `- Kind: ${inline(p.kind)}`,
      `- Time: ${timeOf(p.createdAt)}`,
      "",
    );
    if (p.kind === "system") out.push("System status change:", "");
    out.push(fence(p.body), "");
    if (p.kind === "diff" && p.diff) {
      out.push(`Diff for ${inline(p.diff.filename)} (SIMULATED, illustrative):`, "", fence(p.diff.unified), "");
    }
    if (p.kind === "verification" && p.verification) {
      const v = p.verification;
      out.push(
        "Verification record:",
        "",
        "- Command (recorded text only, not executed):",
        "",
        fence(v.command),
        "",
        `- Result: ${v.result === "pass" ? "PASS" : v.result === "fail" ? "FAIL" : "UNKNOWN"} (as recorded)`,
        `- Source: ${v.simulated ? "SIMULATED" : "recorded"}`,
        "- No command was run by GhostBBS.",
        "",
      );
    }
  });

  const entries = buildLedger({ threads: [thread] });
  const counts = summarizeLedger(entries);
  out.push("## Evidence ledger for this thread", "");
  out.push(`Entries: ${entries.length}. PASS ${counts.PASS}, FAIL ${counts.FAIL}, UNKNOWN ${counts.UNKNOWN}. All outcomes are SIMULATED records.`, "");
  for (const e of entries) {
    const what = e.kind === "diff" ? `diff ${inline(e.filename || "(unnamed)")}` : "verification record";
    out.push(`- [${e.outcome}] ${what}, ref ${inline(e.ref)}, ${timeOf(e.createdAt)}`);
  }
  if (entries.length) out.push("");
  out.push(
    "Note: grouping entries by thread lists them together by reference only. Grouping does not prove a common root cause.",
    "",
  );
  return out.join("\n");
}
