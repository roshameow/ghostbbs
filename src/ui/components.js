// Reusable view pieces. All user text is rendered through h() text nodes.

import { h } from "./dom.js";
import { parseUnified, diffStats } from "../diff.js";
import { STATUSES } from "../validate.js";

export const STATUS_LABELS = {
  open: "OPEN",
  in_progress: "IN PROGRESS",
  blocked: "BLOCKED",
  verified: "VERIFIED",
  closed: "CLOSED",
};

const STATUS_SYMBOLS = { open: "o", in_progress: ">", blocked: "x", verified: "v", closed: "-" };

const KIND_LABELS = {
  message: "message",
  progress: "progress",
  diff: "code diff",
  verification: "verification record",
  system: "system",
};

export function formatTime(iso) {
  return `${String(iso).replace("T", " ").slice(0, 16)} UTC`;
}

export function simBadge() {
  return h("span", { class: "badge badge-sim", title: "Deterministic simulation, not a real AI" }, "[SIMULATED]");
}

export function statusBadge(status) {
  return h("span", { class: `badge status status-${status}` }, `[${STATUS_SYMBOLS[status] || "?"} ${STATUS_LABELS[status] || status}]`);
}

export function screenTitle(text) {
  return h("h1", { id: "screen-title", tabindex: "-1", "data-focus": "title" }, text);
}

export function diffView(diff) {
  const lines = parseUnified(diff.unified);
  const stats = diffStats(lines);
  return h(
    "figure",
    { class: "diff" },
    h("figcaption", null, `Diff for ${diff.filename}: ${stats.added} added (+), ${stats.removed} removed (-)`),
    h(
      "pre",
      { class: "diff-body", tabindex: "0", role: "region", "aria-label": `Unified diff for ${diff.filename}` },
      lines.map((l) => h("span", { class: `diff-line diff-${l.type}` }, l.text + "\n")),
    ),
  );
}

export function verificationRecord(v, post) {
  const pass = v.result === "pass";
  return h(
    "dl",
    { class: `verification verification-${v.result}` },
    h("dt", null, "Command (not executed)"),
    h("dd", null, h("code", null, v.command)),
    h("dt", null, "Result"),
    h("dd", null, h("strong", null, pass ? "[PASS]" : "[FAIL]"), " ", pass ? "reported as passing" : "reported as failing"),
    h("dt", null, "Source"),
    h("dd", null, v.simulated ? "SIMULATED record. Illustrative data; no command was run." : "Record"),
    h("dt", null, "Recorded at"),
    h("dd", null, formatTime(post.createdAt)),
  );
}

export function postItem(post, agentsById) {
  const agent = agentsById.get(post.authorId);
  const author = agent ? agent.handle : post.authorId === "human" ? "guest" : "SYSTEM";
  return h(
    "li",
    { class: `post post-${post.kind}`, id: `post-${post.id}` },
    h(
      "div",
      { class: "post-head" },
      h("strong", { class: "post-author" }, author),
      agent ? [" ", simBadge()] : null,
      " ",
      h("span", { class: "post-kind" }, `<${KIND_LABELS[post.kind] || post.kind}>`),
      " ",
      h("time", { datetime: post.createdAt }, formatTime(post.createdAt)),
    ),
    h("p", { class: "post-body" }, post.body),
    post.kind === "diff" && post.diff ? diffView(post.diff) : null,
    post.kind === "verification" && post.verification ? verificationRecord(post.verification, post) : null,
  );
}

export function statusSelect(thread, onChange) {
  const id = `status-${thread.id}`;
  return h(
    "div",
    { class: "field inline" },
    h("label", { for: id }, "Status "),
    h(
      "select",
      { id, "data-focus": "status", onchange: (e) => onChange(e.target.value) },
      STATUSES.map((s) => h("option", { value: s, selected: s === thread.status }, STATUS_LABELS[s])),
    ),
  );
}
