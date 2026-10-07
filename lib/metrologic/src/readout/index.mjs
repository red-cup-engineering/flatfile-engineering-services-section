// @red-cup-engineering/metrologic/readout — a reading → style/readout utility, on zero dependencies.
//
// Reads a reading's FOUR place as the bilattice already names it (`absurd`/`potential`/`active`/`stable`
// — see reading.mjs's header), plus two order-derived numbers a renderer needs and would otherwise
// re-invent per consumer: `knowledgeWeight` (how many sides are told — 0, 1, or 2) and `salience`, a
// total draw-priority ranking that resolves the two knowledge-weight-1 places (`potential` vs `active`)
// by truth. `styleFor` replaces the hand-rolled switch/lookup a renderer would otherwise write per FOUR
// place with one call, validated against all four places up front.
//
// This absorbs the *shape* that consumers (abrash, tsander) had each hand-rolled as a local `FOUR =
// {T,F,BOT,TOP}` string-tag table keyed for rendering (a wall-color table, a glyph table, a salience
// ordering) — it does not bake in any consumer's colors or glyphs, only the theory-derived
// classification and ordering a style table is looked up by.

import { readingFamilies, readingOfSides, sidesOfReading as sidesOf } from "@red-cup-engineering/computer-data-engineering-services-section/four";

/** @typedef {string} Point a FOUR reading's name (a SignCell cell reads through its `valueOf`) */

/** The canonical FOUR place names, in the bilattice's own vocabulary (reading.mjs's header comment). */
export const PLACES = readingFamilies.knowledge;

/**
 * The FOUR place a point reads at, by its told sides: `[F,F]` absurd, `[T,F]` potential, `[F,T]`
 * active, `[T,T]` stable.
 * @param {Point} point @returns {"absurd"|"potential"|"active"|"stable"}
 */
export function place(point) {
  return readingOfSides("knowledge", ...sidesOf(point));
}

/**
 * How many sides are told: 0 (absurd), 1 (potential or active — the knowledge order's middle, where
 * the two places tie), or 2 (stable). The knowledge order's own measure of "how determined."
 * @param {Point} point @returns {0|1|2}
 */
export function knowledgeWeight(point) {
  const [pos, neg] = sidesOf(point);
  return (pos ? 1 : 0) + (neg ? 1 : 0);
}

/**
 * A total draw-priority ranking, derived from the two σ-dual orders rather than picked by hand:
 * `knowledgeWeight × 2 + (pos ? 1 : 0)` — knowledge breaks the tie between places first, truth (the pos
 * bit) breaks the tie the knowledge order leaves between `potential` and `active`. Yields
 * `absurd(0) < active(2) < potential(3) < stable(5)`, a genuine total order derived from the bilattice's
 * own structure (not an arbitrary enum a renderer would otherwise assign).
 * @param {Point} point @returns {number}
 */
export function salience(point) {
  const [pos] = sidesOf(point);
  return knowledgeWeight(point) * 2 + (pos ? 1 : 0);
}

/**
 * The full readout of a point: its place, knowledge weight, salience rank, and whether it is `⊤`
 * (told-both — the paraconsistent locus `compare` in SignCraft's `descent.mjs` partitions on).
 * @param {Point} point @returns {{ place: string, knowledgeWeight: number, salience: number, top: boolean }}
 */
export function readout(point) {
  return Object.freeze({ place: place(point), knowledgeWeight: knowledgeWeight(point), salience: salience(point), top: knowledgeWeight(point) === 2 });
}

/**
 * Look a reading's place up in a style table — the theory-derived replacement for a hand-rolled
 * switch/keyed-object per FOUR place (as abrash's `WALL_COLOR` and tsander's `READING_GLYPH` each were).
 * `table` must cover all four `PLACES`; validated up front so a missing place fails at the call site,
 * not with `undefined` three functions later.
 * @template T @param {Point} point @param {Record<"absurd"|"potential"|"active"|"stable", T>} table @returns {T}
 */
export function styleFor(reading, table) {
  assertStyleTable(table);
  return table[place(reading)];
}

/**
 * Validate a style table covers all four FOUR places.
 * @param {Record<string, unknown>} table
 */
export function assertStyleTable(table) {
  if (!table || typeof table !== "object") {
    throw new TypeError("assertStyleTable: expected an object keyed by the four FOUR places");
  }
  for (const p of PLACES) {
    if (!(p in table)) throw new TypeError(`assertStyleTable: table is missing "${p}"`);
  }
}
