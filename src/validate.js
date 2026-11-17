// Schema validation for loaded state and imported JSON. Pure, no DOM.

export const SCHEMA_VERSION = 1;
export const STATUSES = ["open", "in_progress", "blocked", "verified", "closed"];
export const ROLES = ["planner", "coder", "reviewer", "verifier"];
export const POST_KINDS = ["message", "progress", "diff", "verification", "system"];

export const LIMITS = {
  maxImportChars: 5 * 1024 * 1024,
  maxThreads: 2000,
  maxPosts: 500,
  maxTitle: 200,
  maxBody: 20000,
  maxHandle: 24,
};

const MAX_ERRORS = 20;

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isStr = (v) => typeof v === "string";
const isInt = (v) => Number.isInteger(v);

/** Validate a full state object. Returns { ok, errors }. */
export function validateState(obj) {
  const errors = [];
  const err = (msg) => {
    if (errors.length < MAX_ERRORS) errors.push(msg);
  };

  if (!isObj(obj)) return { ok: false, errors: ["State must be an object."] };
  if (obj.schemaVersion !== SCHEMA_VERSION) {
    return { ok: false, errors: [`Unsupported schemaVersion (expected ${SCHEMA_VERSION}).`] };
  }
  if (!isInt(obj.seed)) err("seed must be an integer.");
  if (!isInt(obj.clock) || obj.clock < 0) err("clock must be a non-negative integer.");

  const boardIds = new Set();
  if (!Array.isArray(obj.boards) || obj.boards.length === 0) err("boards must be a non-empty array.");
  else {
    obj.boards.forEach((b, i) => {
      if (!isObj(b) || !isStr(b.id) || !isStr(b.name) || !isStr(b.description) || !b.id) {
        err(`boards[${i}] is malformed.`);
        return;
      }
      if (boardIds.has(b.id)) err(`Duplicate board id "${b.id}".`);
      boardIds.add(b.id);
    });
  }

  const agentIds = new Set();
  if (!Array.isArray(obj.agents)) err("agents must be an array.");
  else {
    obj.agents.forEach((a, i) => {
      if (!isObj(a) || !isStr(a.id) || !isStr(a.handle) || !isStr(a.bio) || !a.id) {
        err(`agents[${i}] is malformed.`);
        return;
      }
      if (!ROLES.includes(a.role)) err(`agents[${i}] has invalid role.`);
      if (a.simulated !== true) err(`agents[${i}] must have simulated: true.`);
      if (agentIds.has(a.id)) err(`Duplicate agent id "${a.id}".`);
      agentIds.add(a.id);
    });
  }

  if (!Array.isArray(obj.threads)) err("threads must be an array.");
  else {
    if (obj.threads.length > LIMITS.maxThreads) err(`Too many threads (max ${LIMITS.maxThreads}).`);
    const threadIds = new Set();
    obj.threads.slice(0, LIMITS.maxThreads).forEach((t, i) => {
      const where = `threads[${i}]`;
      if (!isObj(t) || !isStr(t.id) || !t.id) {
        err(`${where} is malformed.`);
        return;
      }
      if (threadIds.has(t.id)) err(`Duplicate thread id "${t.id}".`);
      threadIds.add(t.id);
      if (!boardIds.has(t.boardId)) err(`${where} references unknown board.`);
      if (!isStr(t.title) || !t.title || t.title.length > LIMITS.maxTitle) err(`${where} has invalid title.`);
      if (!isStr(t.body) || t.body.length > LIMITS.maxBody) err(`${where} has invalid body.`);
      if (!isStr(t.author)) err(`${where} has invalid author.`);
      if (!STATUSES.includes(t.status)) err(`${where} has invalid status.`);
      if (!isStr(t.createdAt)) err(`${where} has invalid createdAt.`);
      if (!isInt(t.scriptStep) || t.scriptStep < 0) err(`${where} has invalid scriptStep.`);
      if (!Array.isArray(t.posts)) {
        err(`${where}.posts must be an array.`);
        return;
      }
      if (t.posts.length > LIMITS.maxPosts) err(`${where} has too many posts (max ${LIMITS.maxPosts}).`);
      const postIds = new Set();
      t.posts.slice(0, LIMITS.maxPosts).forEach((p, j) => {
        const pw = `${where}.posts[${j}]`;
        if (!isObj(p) || !isStr(p.id) || !p.id) {
          err(`${pw} is malformed.`);
          return;
        }
        if (postIds.has(p.id)) err(`Duplicate post id "${p.id}" in ${where}.`);
        postIds.add(p.id);
        if (!POST_KINDS.includes(p.kind)) err(`${pw} has invalid kind.`);
        if (!isStr(p.createdAt)) err(`${pw} has invalid createdAt.`);
        if (!isStr(p.body) || p.body.length > LIMITS.maxBody) err(`${pw} has invalid body.`);
        if (!isStr(p.authorId) || !(p.authorId === "human" || p.authorId === "system" || agentIds.has(p.authorId))) {
          err(`${pw} has unknown authorId.`);
        }
        if (p.kind === "diff") {
          if (!isObj(p.diff) || !isStr(p.diff.filename) || !isStr(p.diff.unified)) err(`${pw} needs a diff object.`);
        }
        if (p.kind === "verification") {
          const v = p.verification;
          if (!isObj(v) || !isStr(v.command) || !["pass", "fail"].includes(v.result) || v.simulated !== true) {
            err(`${pw} needs a simulated verification record.`);
          }
        }
      });
    });
  }

  return { ok: errors.length === 0, errors };
}

/** Parse and validate imported JSON text. Returns { ok, state?, errors }. */
export function parseImport(text) {
  if (!isStr(text)) return { ok: false, errors: ["Import must be text."] };
  if (text.length > LIMITS.maxImportChars) {
    return { ok: false, errors: ["File is too large (limit 5 MB)."] };
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["File is not valid JSON."] };
  }
  const result = validateState(data);
  if (!result.ok) return { ok: false, errors: result.errors };
  return { ok: true, state: data, errors: [] };
}

/** Validate input for a new thread. Returns an array of error strings. */
export function validateThreadInput(state, input) {
  const errors = [];
  const i = input || {};
  if (!state.boards.some((b) => b.id === i.boardId)) errors.push("Choose a board.");
  const title = isStr(i.title) ? i.title.trim() : "";
  if (!title) errors.push("Title is required.");
  else if (title.length > LIMITS.maxTitle) errors.push(`Title must be at most ${LIMITS.maxTitle} characters.`);
  const body = isStr(i.body) ? i.body.trim() : "";
  if (!body) errors.push("Description is required.");
  else if (body.length > LIMITS.maxBody) errors.push(`Description must be at most ${LIMITS.maxBody} characters.`);
  if (isStr(i.author) && i.author.trim().length > LIMITS.maxHandle) {
    errors.push(`Handle must be at most ${LIMITS.maxHandle} characters.`);
  }
  if (state.threads.length >= LIMITS.maxThreads) errors.push("Thread limit reached.");
  return errors;
}

/** Validate input for a human reply. Returns an array of error strings. */
export function validatePostInput(input) {
  const body = input && isStr(input.body) ? input.body.trim() : "";
  if (!body) return ["Reply text is required."];
  if (body.length > LIMITS.maxBody) return [`Reply must be at most ${LIMITS.maxBody} characters.`];
  return [];
}
