// Seeded PRNG and logical clock. Pure, deterministic, no DOM.

/** mulberry32: returns a function producing floats in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a 32-bit hash of a string. */
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Pick one item from a non-empty array using the given rng. */
export function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

/** Fixed base for logical timestamps: 2026-01-01T09:00:00Z. */
export const BASE_TIME = Date.UTC(2026, 0, 1, 9, 0, 0);

/** Convert a logical clock tick into a reproducible ISO timestamp (one tick = one minute). */
export function logicalTime(tick) {
  return new Date(BASE_TIME + tick * 60000).toISOString();
}
