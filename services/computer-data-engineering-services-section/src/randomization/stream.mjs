/**
 * `stream` — the house's one seeded draw stream over `mulberry32`, previously rebuilt draw for
 * draw in parlor-kernel, cast, energy-bank, card-table, solitaire, ruinfold, fearful, crucible,
 * onestone, gambling-trainer and flickering. Every draw is a pure function of the seed, so a
 * stored seed replays the same draws forever.
 */

import { hashSeed } from "./hash-seed.mjs";
import { mulberry32 } from "./mulberry32.mjs";

/**
 * Draws from a 32-bit state: `next()` in [0, 1); `int(min, max)` inclusive; `range(min, max)`
 * real; `pick(items)` one element, `undefined` from an empty list; `chance(p)` true with
 * probability p; `shuffle(items)` a Fisher–Yates copy.
 */
export function randomStream(state) {
  const next = mulberry32(state);
  const int = (min, max) => min + Math.floor(next() * (max - min + 1));
  return {
    next,
    int,
    range: (min, max) => min + next() * (max - min),
    pick: (items) => (items.length === 0 ? undefined : items[Math.floor(next() * items.length)]),
    chance: (p) => next() < p,
    shuffle: (items) => {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(0, i);
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}

/** Draws from a seed string, optionally namespaced by parts: `seededStream(seed, ...parts)` hashes
 *  `[seed, ...parts].join(":")`. Distinct keys give independent streams, so `(seed, "dice")` and
 *  `(seed, "reels")` never disturb each other, and one root seed reproduces every sub-stream. */
export function seededStream(seed, ...parts) {
  return randomStream(hashSeed([seed, ...parts.map(String)].join(":")));
}
