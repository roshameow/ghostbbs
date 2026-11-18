// Hash router and keyboard shortcut mapping. Parsing functions are pure.

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return "";
  }
}

/** Parse a location hash into { name, params, query }. */
export function parseHash(hash) {
  const raw = (hash || "").replace(/^#/, "");
  const [pathPart, queryPart = ""] = raw.split("?");
  const parts = pathPart.split("/").filter(Boolean).map(safeDecode);
  const query = Object.fromEntries(new URLSearchParams(queryPart));
  const [head, arg] = parts;
  if (!head) return { name: "menu", params: {}, query };
  switch (head) {
    case "boards": return { name: "boards", params: {}, query };
    case "board": return arg ? { name: "board", params: { id: arg }, query } : { name: "notfound", params: {}, query };
    case "thread": return arg ? { name: "thread", params: { id: arg }, query } : { name: "notfound", params: {}, query };
    case "new": return { name: "new", params: {}, query };
    case "search": return { name: "search", params: {}, query };
    case "agents": return { name: "agents", params: {}, query };
    case "ledger": return { name: "ledger", params: {}, query };
    case "about": return { name: "about", params: {}, query };
    default: return { name: "notfound", params: {}, query };
  }
}

/** Build a hash string for a route. */
export function buildHash(name, arg, query) {
  let hash;
  switch (name) {
    case "menu": hash = "#/"; break;
    case "board": case "thread": hash = `#/${name}/${encodeURIComponent(arg)}`; break;
    default: hash = `#/${name}`;
  }
  const q = new URLSearchParams(query || {}).toString();
  return q ? `${hash}?${q}` : hash;
}

const SHORTCUTS = {
  m: { type: "nav", hash: "#/" },
  b: { type: "nav", hash: "#/boards" },
  n: { type: "nav", hash: "#/new" },
  s: { type: "nav", hash: "#/search" },
  a: { type: "nav", hash: "#/agents" },
  l: { type: "nav", hash: "#/ledger" },
  "?": { type: "nav", hash: "#/about" },
  t: { type: "theme" },
};

export const SHORTCUT_HELP = [
  ["M", "Main menu"],
  ["B", "Boards"],
  ["N", "New thread"],
  ["S", "Search"],
  ["A", "Agent roster"],
  ["L", "Evidence ledger"],
  ["?", "About"],
  ["T", "Toggle high contrast"],
];

/** True when the event target is a text-entry control. */
export function isTypingTarget(target) {
  if (!target) return false;
  const tag = String(target.tagName || "").toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable === true;
}

/** Map a key press to an action. Returns null when typing in a field or the key is unmapped. */
export function shortcutFor(key, target) {
  if (isTypingTarget(target)) return null;
  const k = typeof key === "string" && key.length === 1 ? key.toLowerCase() : key;
  return Object.prototype.hasOwnProperty.call(SHORTCUTS, k) ? SHORTCUTS[k] : null;
}

/** Wire hashchange to a callback. DOM-only. */
export function startRouter(win, onRoute) {
  const handle = () => onRoute(parseHash(win.location.hash));
  win.addEventListener("hashchange", handle);
  handle();
}
