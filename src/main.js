// Bootstrap: storage, store, routing, global controls and keyboard shortcuts.

import { createStore, createSafeStorage } from "./store.js";
import { startRouter, shortcutFor, buildHash } from "./router.js";
import { LIMITS } from "./validate.js";
import { replace } from "./ui/dom.js";
import {
  menuScreen, boardsScreen, boardScreen, threadScreen, newThreadScreen,
  searchScreen, agentsScreen, ledgerScreen, aboutScreen, notFoundScreen,
} from "./ui/screens.js";

const PREFS_KEY = "ghostbbs:v1:prefs";

const { storage, persistent } = createSafeStorage(() => window.localStorage);
const store = createStore(storage);

const mainEl = document.getElementById("main");
const liveEl = document.getElementById("live");
const dataMsg = document.getElementById("data-msg");
const themeBtn = document.getElementById("theme-toggle");
const fileInput = document.getElementById("import-file");

let currentRoute = { name: "menu", params: {}, query: {} };

function announce(message) {
  liveEl.textContent = "";
  liveEl.textContent = message;
}

function say(message) {
  dataMsg.textContent = message;
  announce(message);
}

function navigate(hash) {
  if (window.location.hash === hash) render(currentRoute);
  else window.location.hash = hash;
}

const actions = {
  createThread(input) {
    const r = store.createThread(input);
    if (r.ok) {
      announce("Thread created.");
      navigate(buildHash("thread", r.id));
    }
    return r;
  },
  addPost(id, input) {
    const r = store.addPost(id, input);
    if (r.ok) {
      announce("Reply added.");
      render(currentRoute, "reply");
    }
    return r;
  },
  setStatus(id, status) {
    const r = store.setStatus(id, status);
    if (r.ok) {
      announce(`Status set to ${status.replace("_", " ")}.`);
      render(currentRoute, "status");
    }
    return r;
  },
  runAgents(id) {
    const r = store.runAgents(id);
    if (r.ok) {
      announce(`${r.added} simulated agent posts added. These are scripted, not real AI output.`);
      render(currentRoute, "run");
    }
    return r;
  },
};

function render(route, focusKey) {
  currentRoute = route;
  const ctx = { state: store.getState(), actions, status: store.getStatus() };
  let node;
  switch (route.name) {
    case "menu": node = menuScreen(ctx); break;
    case "boards": node = boardsScreen(ctx); break;
    case "board": node = boardScreen(ctx, route.params.id); break;
    case "thread": node = threadScreen(ctx, route.params.id); break;
    case "new": node = newThreadScreen(ctx, route.query); break;
    case "search": node = searchScreen(ctx, route.query, navigate); break;
    case "agents": node = agentsScreen(ctx); break;
    case "ledger": node = ledgerScreen(ctx, route.query, navigate); break;
    case "about": node = aboutScreen(ctx); break;
    default: node = notFoundScreen();
  }
  replace(mainEl, node);
  const title = mainEl.querySelector("h1");
  document.title = `${title ? title.textContent : "GhostBBS"} - GhostBBS`;
  const target =
    (focusKey && mainEl.querySelector(`[data-focus="${focusKey}"]:not([disabled])`)) || title;
  if (target && (focusKey || route.__navigated)) target.focus();
}

// ---- theme ----
function applyTheme(contrast) {
  document.documentElement.dataset.theme = contrast ? "contrast" : "default";
  themeBtn.setAttribute("aria-pressed", String(contrast));
  themeBtn.textContent = contrast ? "High contrast: ON" : "High contrast: OFF";
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme !== "contrast";
  applyTheme(next);
  try {
    storage.setItem(PREFS_KEY, JSON.stringify({ contrast: next }));
  } catch {
    /* preference is optional */
  }
  announce(next ? "High contrast on." : "High contrast off.");
}

function loadTheme() {
  try {
    const prefs = JSON.parse(storage.getItem(PREFS_KEY) || "null");
    if (prefs && prefs.contrast === true) return true;
  } catch {
    /* ignore */
  }
  return false;
}

// ---- data controls ----
function exportData() {
  const blob = new Blob([store.exportJson()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ghostbbs-export.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  say("Exported ghostbbs-export.json.");
}

function importFile(file) {
  if (!file) return;
  if (file.size > LIMITS.maxImportChars) {
    say("Import rejected: file is too large (limit 5 MB).");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const r = store.importJson(String(reader.result));
    if (r.ok) {
      say("Import complete.");
      navigate("#/");
      render({ name: "menu", params: {}, query: {} });
    } else {
      say(`Import rejected: ${r.errors.slice(0, 3).join(" ")}`);
    }
  };
  reader.onerror = () => say("Import rejected: could not read the file.");
  reader.readAsText(file);
}

function resetData() {
  if (!window.confirm("Reset all data to the synthetic seed data? Your threads will be lost.")) return;
  store.reset();
  say("Data reset to seed.");
  navigate("#/");
  render({ name: "menu", params: {}, query: {} });
}

document.getElementById("export-btn").addEventListener("click", exportData);
document.getElementById("reset-btn").addEventListener("click", resetData);
document.getElementById("import-btn").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  importFile(fileInput.files[0]);
  fileInput.value = "";
});
themeBtn.addEventListener("click", toggleTheme);

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
  const action = shortcutFor(e.key, e.target);
  if (!action) return;
  e.preventDefault();
  if (action.type === "theme") toggleTheme();
  else navigate(action.hash);
});

// ---- start ----
applyTheme(loadTheme());
let first = true;
startRouter(window, (route) => {
  route.__navigated = !first;
  first = false;
  render(route);
});
const initial = store.getStatus();
if (initial.source === "fallback") say("Saved data was invalid. Seed data restored.");
else if (!persistent) say("Browser storage is unavailable. Changes will not be saved.");
