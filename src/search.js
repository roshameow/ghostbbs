// Thread filtering and text search. Pure, no DOM.

/** Agent ids and "human" that authored at least one post in the thread. */
export function threadParticipants(thread) {
  return new Set(thread.posts.map((p) => p.authorId));
}

/**
 * Filter threads. All filters are optional and combined with AND.
 * Text is case-insensitive and matches thread title, body, author,
 * and post bodies and author handles. Newest threads first.
 */
export function filterThreads(state, filters = {}) {
  const text = (filters.text || "").trim().toLowerCase();
  const handles = new Map(state.agents.map((a) => [a.id, a.handle.toLowerCase()]));
  const result = [];
  for (let i = state.threads.length - 1; i >= 0; i--) {
    const t = state.threads[i];
    if (filters.boardId && t.boardId !== filters.boardId) continue;
    if (filters.status && t.status !== filters.status) continue;
    if (filters.agentId && !threadParticipants(t).has(filters.agentId)) continue;
    if (text && !matchesText(t, text, handles)) continue;
    result.push(t);
  }
  return result;
}

function matchesText(thread, text, handles) {
  if (thread.title.toLowerCase().includes(text)) return true;
  if (thread.body.toLowerCase().includes(text)) return true;
  if (thread.author.toLowerCase().includes(text)) return true;
  return thread.posts.some(
    (p) => p.body.toLowerCase().includes(text) || (handles.get(p.authorId) || "").includes(text),
  );
}
