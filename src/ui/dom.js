// Tiny DOM helper. Text always goes through text nodes, never markup parsing.

const BLOCKED_ATTRS = new Set(["style", "srcdoc"]);

/** Create an element. attrs: plain object; children: strings, nodes, arrays, or null. */
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key.startsWith("on")) {
      if (typeof value === "function") el.addEventListener(key.slice(2).toLowerCase(), value);
      continue;
    }
    if (BLOCKED_ATTRS.has(key)) continue;
    if (key === "class") el.className = value;
    else if (value === true) el.setAttribute(key, "");
    else el.setAttribute(key, String(value));
  }
  append(el, children);
  return el;
}

/** Append strings (as text nodes), nodes and nested arrays. */
export function append(parent, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(parent, child);
    else if (typeof child === "string" || typeof child === "number") {
      parent.appendChild(document.createTextNode(String(child)));
    } else parent.appendChild(child);
  }
  return parent;
}

/** Replace all children of a node. */
export function replace(parent, ...children) {
  parent.replaceChildren();
  append(parent, children);
  return parent;
}
