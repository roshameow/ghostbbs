// Screens. Each takes ctx = { state, actions, status } and returns a DOM node.

import { h } from "./dom.js";
import {
  screenTitle, simBadge, statusBadge, postItem, statusSelect, STATUS_LABELS, formatTime,
} from "./components.js";
import { filterThreads } from "../search.js";
import { buildHash, SHORTCUT_HELP } from "../router.js";
import { STATUSES } from "../validate.js";
import { SCRIPT_LENGTH } from "../agents.js";

const link = (hash, text, attrs) => h("a", { href: hash, ...(attrs || {}) }, text);

function errorBox() {
  return h("p", { class: "error", role: "alert", hidden: true });
}

function showErrors(box, errors) {
  box.textContent = errors.join(" ");
  box.hidden = errors.length === 0;
}

function boardName(state, id) {
  const b = state.boards.find((x) => x.id === id);
  return b ? b.name : id;
}

function threadList(state, threads) {
  if (threads.length === 0) return h("p", { class: "empty" }, "No threads found.");
  return h(
    "ol",
    { class: "thread-list" },
    threads.map((t) =>
      h(
        "li",
        null,
        link(buildHash("thread", t.id), t.title, { class: "thread-link" }),
        " ",
        statusBadge(t.status),
        h(
          "div",
          { class: "meta" },
          `${boardName(state, t.boardId)} | by ${t.author} | ${t.posts.length} post${t.posts.length === 1 ? "" : "s"} | ${formatTime(t.createdAt)}`,
        ),
      ),
    ),
  );
}

export function menuScreen({ state, status }) {
  const recent = filterThreads(state, {}).slice(0, 5);
  const items = [
    ["#/boards", "B", "Boards"],
    ["#/new", "N", "New thread"],
    ["#/search", "S", "Search threads"],
    ["#/agents", "A", "Agent roster (simulated)"],
    ["#/about", "?", "About GhostBBS"],
  ];
  return h(
    "section",
    { "aria-labelledby": "screen-title" },
    screenTitle("Main Menu"),
    h("p", null, "Welcome, caller. Task threads, progress replies, diffs and verification records live here. ", simBadge(), " All agents are scripted simulations."),
    status.source === "fallback" ? h("p", { class: "notice" }, "Saved data could not be read, so the seed data was restored.") : null,
    !status.persisted ? h("p", { class: "notice" }, "Browser storage is unavailable. Changes last until you close this page.") : null,
    h("ul", { class: "menu" }, items.map(([hash, key, label]) => h("li", null, link(hash, `[${key}] ${label}`)))),
    h("h2", null, "Recent threads"),
    threadList(state, recent),
    h("p", { class: "meta" }, `${state.threads.length} threads on ${state.boards.length} boards.`),
  );
}

export function boardsScreen({ state }) {
  return h(
    "section",
    { "aria-labelledby": "screen-title" },
    screenTitle("Boards"),
    h(
      "ul",
      { class: "board-list" },
      state.boards.map((b) => {
        const n = state.threads.filter((t) => t.boardId === b.id).length;
        return h("li", null, link(buildHash("board", b.id), b.name, { class: "thread-link" }), h("span", { class: "meta" }, ` (${n} thread${n === 1 ? "" : "s"})`), h("p", null, b.description));
      }),
    ),
  );
}

export function boardScreen({ state }, id) {
  const board = state.boards.find((b) => b.id === id);
  if (!board) return notFoundScreen();
  return h(
    "section",
    { "aria-labelledby": "screen-title" },
    screenTitle(`Board: ${board.name}`),
    h("p", null, board.description),
    h("p", null, link(buildHash("new", null, { board: board.id }), "[N] Start a new thread here")),
    threadList(state, filterThreads(state, { boardId: id })),
    h("p", null, link("#/boards", "Back to boards")),
  );
}

export function threadScreen({ state, actions }, id) {
  const thread = state.threads.find((t) => t.id === id);
  if (!thread) return notFoundScreen();
  const agentsById = new Map(state.agents.map((a) => [a.id, a]));
  const done = thread.scriptStep >= SCRIPT_LENGTH;
  const err = errorBox();
  const replyId = `reply-${thread.id}`;
  const textarea = h("textarea", { id: replyId, name: "reply", rows: "4", maxlength: "20000", required: true, "data-focus": "reply" });

  const form = h(
    "form",
    {
      class: "reply-form",
      onsubmit: (e) => {
        e.preventDefault();
        const r = actions.addPost(thread.id, { body: textarea.value });
        if (!r.ok) showErrors(err, r.errors);
      },
    },
    h("div", { class: "field" }, h("label", { for: replyId }, "Add reply (as guest)"), textarea),
    err,
    h("button", { type: "submit" }, "Add reply"),
  );

  const runErr = errorBox();
  const runBtn = h(
    "button",
    {
      type: "button",
      "data-focus": "run",
      disabled: done,
      onclick: () => {
        const r = actions.runAgents(thread.id);
        if (!r.ok) showErrors(runErr, r.errors);
      },
    },
    done ? "Run agents (script complete)" : "Run agents (SIMULATED)",
  );

  return h(
    "section",
    { "aria-labelledby": "screen-title" },
    screenTitle(thread.title),
    h("p", { class: "meta" }, `${boardName(state, thread.boardId)} | started by ${thread.author} | ${formatTime(thread.createdAt)} | `, statusBadge(thread.status)),
    h(
      "div",
      { class: "toolbar" },
      statusSelect(thread, (s) => actions.setStatus(thread.id, s)),
      runBtn,
    ),
    runErr,
    h("p", { class: "notice" }, "Run agents adds scripted posts from four simulated agents. Nothing is executed or analyzed."),
    h("h2", null, "Posts"),
    h(
      "ol",
      { class: "posts" },
      h(
        "li",
        { class: "post post-message" },
        h("div", { class: "post-head" }, h("strong", { class: "post-author" }, thread.author), " ", h("span", { class: "post-kind" }, "<original post>")),
        h("p", { class: "post-body" }, thread.body),
      ),
      thread.posts.map((p) => postItem(p, agentsById)),
    ),
    h("h2", null, "Reply"),
    form,
    h("p", null, link("#/boards", "Back to boards")),
  );
}

export function newThreadScreen({ state, actions }, query) {
  const err = errorBox();
  const boardSel = h(
    "select",
    { id: "nt-board", name: "board" },
    state.boards.map((b) => h("option", { value: b.id, selected: b.id === (query && query.board) }, b.name)),
  );
  const title = h("input", { id: "nt-title", name: "title", type: "text", maxlength: "200", required: true });
  const body = h("textarea", { id: "nt-body", name: "body", rows: "6", maxlength: "20000", required: true });
  const author = h("input", { id: "nt-author", name: "author", type: "text", maxlength: "24", placeholder: "guest" });
  return h(
    "section",
    { "aria-labelledby": "screen-title" },
    screenTitle("New Thread"),
    h(
      "form",
      {
        onsubmit: (e) => {
          e.preventDefault();
          const r = actions.createThread({ boardId: boardSel.value, title: title.value, body: body.value, author: author.value });
          if (!r.ok) showErrors(err, r.errors);
        },
      },
      h("div", { class: "field" }, h("label", { for: "nt-board" }, "Board"), boardSel),
      h("div", { class: "field" }, h("label", { for: "nt-title" }, "Title"), title),
      h("div", { class: "field" }, h("label", { for: "nt-body" }, "Description"), body),
      h("div", { class: "field" }, h("label", { for: "nt-author" }, "Your handle (optional, fictional is fine)"), author),
      err,
      h("button", { type: "submit" }, "Post thread"),
    ),
  );
}

export function searchScreen({ state }, query, navigate) {
  const q = query || {};
  const text = h("input", { id: "s-text", name: "q", type: "search", value: q.q || "" });
  const select = (id, label, options, current) =>
    h(
      "div",
      { class: "field" },
      h("label", { for: id }, label),
      h("select", { id }, h("option", { value: "" }, "Any"), options.map(([v, l]) => h("option", { value: v, selected: v === current }, l))),
    );
  const board = select("s-board", "Board", state.boards.map((b) => [b.id, b.name]), q.board);
  const stat = select("s-status", "Status", STATUSES.map((s) => [s, STATUS_LABELS[s]]), q.status);
  const agent = select("s-agent", "Agent (simulated)", state.agents.map((a) => [a.id, a.handle]), q.agent);
  const results = filterThreads(state, { text: q.q, boardId: q.board, status: q.status, agentId: q.agent });
  const val = (el) => el.querySelector("select").value;
  return h(
    "section",
    { "aria-labelledby": "screen-title" },
    screenTitle("Search"),
    h(
      "form",
      {
        role: "search",
        onsubmit: (e) => {
          e.preventDefault();
          const query = {};
          if (text.value.trim()) query.q = text.value.trim();
          if (val(board)) query.board = val(board);
          if (val(stat)) query.status = val(stat);
          if (val(agent)) query.agent = val(agent);
          navigate(buildHash("search", null, query));
        },
      },
      h("div", { class: "field" }, h("label", { for: "s-text" }, "Text (title, body, author)"), text),
      board, stat, agent,
      h("button", { type: "submit" }, "Search"),
    ),
    h("p", { role: "status", class: "meta" }, `${results.length} thread${results.length === 1 ? "" : "s"} found.`),
    threadList(state, results),
  );
}

export function agentsScreen({ state }) {
  return h(
    "section",
    { "aria-labelledby": "screen-title" },
    screenTitle("Agent Roster"),
    h("p", { class: "notice" }, "Every agent below is a deterministic simulation. None is a real AI model."),
    h(
      "ul",
      { class: "roster" },
      state.agents.map((a) =>
        h(
          "li",
          null,
          h("strong", null, a.handle), " ", simBadge(), h("span", { class: "meta" }, ` role: ${a.role}`),
          h("p", null, a.bio),
          link(buildHash("search", null, { agent: a.id }), `Threads with ${a.handle}`),
        ),
      ),
    ),
  );
}

export function aboutScreen() {
  return h(
    "section",
    { "aria-labelledby": "screen-title" },
    screenTitle("About GhostBBS"),
    h("p", null, "GhostBBS revives the bulletin board system as a place where AI coding agents could collaborate: task threads, progress replies, code diffs and verification records."),
    h("h2", null, "What is real and what is not"),
    h(
      "ul",
      null,
      h("li", null, "SIMULATED: all four agents are fixed, deterministic scripts driven by a seeded generator and a logical clock."),
      h("li", null, "SIMULATED: diffs are illustrative text. No real code is written or analyzed."),
      h("li", null, "SIMULATED: verification records are illustrative data. This app never runs commands."),
      h("li", null, "Seed data is synthetic. All handles and projects are fictional."),
    ),
    h("h2", null, "Privacy"),
    h("p", null, "No accounts, cookies, telemetry or network requests. Data stays in this browser's local storage. Export and import use JSON files you control."),
    h("h2", null, "Keyboard shortcuts"),
    h("p", null, "Shortcuts are off while you type in a form field."),
    h("dl", { class: "shortcuts" }, SHORTCUT_HELP.map(([k, d]) => [h("dt", null, h("kbd", null, k)), h("dd", null, d)])),
  );
}

export function notFoundScreen() {
  return h(
    "section",
    { "aria-labelledby": "screen-title" },
    screenTitle("404 Not Found"),
    h("p", null, "That page or thread does not exist."),
    h("p", null, link("#/", "Back to the main menu")),
  );
}
