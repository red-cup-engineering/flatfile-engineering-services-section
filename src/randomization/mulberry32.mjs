/**
 * `mulberry32` — the house's one mulberry32 PRNG stepper, previously re-derived bit-for-bit
 * in cast, parlor-kernel, card-table, energy-bank, flickering-561-group, and
 * qwzspace-example-spectate's bots.mjs. Those packages now import this instead of copying it.
 */

/**
 * Build a mulberry32 generator seeded by a 32-bit state — tiny, fast, fully deterministic:
 * the same `seed` always produces the same infinite stream of `next()` values.
 *
 * @param {number} seed a 32-bit seed (coerced with `>>> 0`)
 * @returns {() => number} `next`, yielding the next real in `[0, 1)` on each call
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
