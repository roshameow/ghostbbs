// Unified diff parsing. Pure, no DOM.

/**
 * Parse unified diff text into line objects.
 * type: "meta" | "hunk" | "add" | "del" | "ctx"
 * `text` is the full original line, so the +/- marker stays visible.
 */
export function parseUnified(text) {
  if (typeof text !== "string" || text === "") return [];
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines.map((line) => ({ type: classify(line), text: line }));
}

function classify(line) {
  if (line.startsWith("@@")) return "hunk";
  if (line.startsWith("+++") || line.startsWith("---")) return "meta";
  if (line.startsWith("diff ") || line.startsWith("index ")) return "meta";
  if (line.startsWith("+")) return "add";
  if (line.startsWith("-")) return "del";
  return "ctx";
}

/** Non-color marker for a line type. */
export function markerFor(type) {
  if (type === "add") return "+";
  if (type === "del") return "-";
  return " ";
}

/** Count added and removed lines. */
export function diffStats(lines) {
  let added = 0;
  let removed = 0;
  for (const l of lines) {
    if (l.type === "add") added++;
    else if (l.type === "del") removed++;
  }
  return { added, removed };
}
