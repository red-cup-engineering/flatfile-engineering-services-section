// settlement — the settlement node of the Obsmetrologia proof tree, in JSNode.
//
// THEOREM-LOCUS. `Obsmetrologia/Settlement.lean` (top-level module, sibling of Cohomology/, Site/,
// Language/) abstracts one recurring shape met independently in four places in that library:
//
//   structure Settlement {Base : Type u} (Content : Base → Type v)
//       (Admits : (b : Base) → Content b → Prop) (base : Base) where
//     content : Content base
//     admits  : Admits base content
//
// — a bare base paired with actual accreted content that satisfies the base's own admission law,
// proven in `tiles_beads_hole_cech1_are_settlements` to be instantiated by material tiling
// (`Tiles`), lenticular beadwork (`Beads`), causal boundary theory (`Hole`), and the bitopological
// settling site's own Čech gluing (`Cech1`).
//
// WHAT THIS MODULE IS, HONESTLY. This is NOT a JS transcription of that dependent-type structure,
// and it does not claim the four instances. It is the OPERATIONAL half the Lean structure has no
// need of: given a base (an index set of cells), a content fiber (a knowledge-ordered algebra per
// cell), and a step that accretes content, ITERATE THE STEP TO ITS LEAST FIXED POINT — the point
// at which the base's admission law (here: quiescence, "the step adds nothing further") holds, so
// that a `Settlement`-shaped value is actually in hand rather than merely specified. The Lean
// structure says WHAT a settlement is; this says HOW one is reached and refuses the reaching when
// the knowledge order moves backward. See the section's explanation carrier for the full grading
// (proved / implemented / documented / open).
//
// The parameterization is deliberate and matches the Lean shape one-for-one:
//   Base    ↦ the key set of the settling container (a plain object's keys, or a Map's keys)
//   Content ↦ the cell algebra `{ join, equal, bottom }` — the fiber over each key
//   Admits  ↦ quiescence under the caller's `step`, checked by `equal` after `merge`
// A caller supplies its own already-canonical cell algebra; NOTHING about a particular FOUR
// representation is baked into the generic operations below. The one bound instance this module
// ships (`readingSettlement`) is over the four readings with SignChain's knowledge join, and
// defines no arithmetic of its own.

import { knowledgeJoinReading, samePoint } from "@red-cup-engineering/computer-data-engineering-services-section/four";

/** Raised when a settling orbit moves backward in the knowledge order. */
export class SettlingMonotonicityViolation extends Error {
  constructor(message) {
    super(message);
    this.name = "SettlingMonotonicityViolation";
    this.code = "settling-monotonicity-violation";
  }
}

/** Raised when an iteration budget is exhausted without reaching a fixed point. */
export class SettlementDivergence extends Error {
  constructor(message) {
    super(message);
    this.name = "SettlementDivergence";
    this.code = "settlement-divergence";
  }
}

// === the generic combinator ====================================================================

/**
 * Iterate `step` from `start` to a fixed point of the content order.
 *
 * `merge` is the content semilattice's join and `equal` its equality; the caller owns both, so
 * this combinator is carrier-generic (plain objects, Maps, anything `merge`/`equal` agree on).
 * `step` must be knowledge-monotone and inflationary (x ≤ step(x)); on a bounded fiber the orbit
 * is then increasing and bounded, so it converges. The initial state is `merge(start, start)` —
 * the semilattice's own idempotent copy, so `step` never sees the caller's own value by reference.
 *
 * @param {(state: any) => any} step
 * @param {any} start
 * @param {{ merge: (a: any, b: any) => any, equal: (a: any, b: any) => boolean, maxIter?: number,
 *           divergenceMessage?: string }} options
 * @returns {{ state: any, iterations: number }}
 */
export function settle(step, start, { merge, equal, maxIter = 100_000, divergenceMessage } = {}) {
  if (typeof merge !== "function") throw new TypeError("settle: merge must be the content semilattice's join");
  if (typeof equal !== "function") throw new TypeError("settle: equal must be the content semilattice's equality");
  let state = merge(start, start);
  for (let i = 0; i < maxIter; i += 1) {
    const next = step(state);
    const merged = merge(state, next);
    if (equal(state, merged)) return { state: merged, iterations: i };
    state = merged;
  }
  throw new SettlementDivergence(
    divergenceMessage
      ?? `settling did not converge in ${maxIter} iterations; check that step is knowledge-monotone and inflationary`,
  );
}

/**
 * Does the finite orbit only ever climb? `m ≤ n` implies `orbit[m] ≤ orbit[n]` under `leq`. A
 * dedicated check, not a byproduct of `settle`'s convergence: it holds on any orbit handed to it,
 * whether or not that orbit came from `settle` at all.
 * @param {any[]} orbit @param {{ leq: (a: any, b: any) => boolean }} options
 */
export function orbitMonotone(orbit, { leq } = {}) {
  if (typeof leq !== "function") throw new TypeError("orbitMonotone: leq must be the content order");
  for (let i = 0; i < orbit.length; i += 1) {
    for (let j = i; j < orbit.length; j += 1) {
      if (!leq(orbit[i], orbit[j])) return false;
    }
  }
  return true;
}

/**
 * Hard-abort gate: raises `SettlingMonotonicityViolation` on the first backward movement found in
 * `orbit`. Nothing about the caller's in-flight construction survives the throw.
 * @param {any[]} orbit @param {{ leq: Function, target?: string }} options
 */
export function assertSettlingMonotone(orbit, { leq, target } = {}) {
  if (!orbitMonotone(orbit, { leq })) {
    const where = target ? ` for ${target}` : "";
    throw new SettlingMonotonicityViolation(
      `settling-monotonicity-violation${where}: knowledge order moved backward`,
    );
  }
}

/**
 * The single-step form of the gate: does `after` dominate `before`? Judged the same way — as a
 * two-point orbit through `assertSettlingMonotone` — over a named cell.
 */
export function guardSettlingMonotone(before, after, { leq, cell = "" } = {}) {
  assertSettlingMonotone([before, after], { leq, target: cell });
}

// === lifting a cell algebra to a settling algebra ==============================================

// A cell name is an arbitrary string. "toString", "constructor" and "__proto__"
// are ordinary cell names, never prototype members, so this container reads and
// writes own properties only.
const objectContainer = {
  keys: (settling) => Object.keys(settling),
  get: (settling, key) => (Object.hasOwn(settling, key) ? settling[key] : undefined),
  empty: () => ({}),
  set: (settling, key, value) => {
    Object.defineProperty(settling, key, { value, writable: true, enumerable: true, configurable: true });
    return settling;
  },
  size: (settling) => Object.keys(settling).length,
  has: (settling, key) => Object.hasOwn(settling, key),
};

const mapContainer = {
  keys: (settling) => [...settling.keys()],
  get: (settling, key) => settling.get(key),
  empty: () => new Map(),
  set: (settling, key, value) => settling.set(key, value),
  size: (settling) => settling.size,
  has: (settling, key) => settling.has(key),
};

const containers = { object: objectContainer, map: mapContainer };

/**
 * @typedef {{
 *   valueOf(cell: any): any,
 *   write(cell: any, after: any): any
 * }} CellSettlement
 */

/**
 * @typedef {{
 *   join: Function,
 *   equal: Function,
 *   bottom: any,
 *   container: "object"|"map",
 *   leqCell: (a: any, b: any) => boolean,
 *   merge: (a: any, b: any) => any,
 *   mergeAll: (settlings: Iterable<any>) => any,
 *   equalSettling: (a: any, b: any) => boolean,
 *   settle: (step: (state: any) => any, start: any, options?: object) => { state: any, iterations: number },
 *   orbitMonotone: (orbit: any[]) => boolean,
 *   assertSettlingMonotone: (orbit: any[], options?: object) => void,
 *   guardSettlingMonotone: (before: any, after: any, options?: object) => void,
 *   CellSettlement: new () => CellSettlement
 * }} SettlementAlgebra
 */

/**
 * Lift a cell algebra into the settling algebra over a container of cells — the JS reading of the
 * Lean `Settlement Content Admits` parameterization. `join`/`equal`/`bottom` are the content
 * fiber; `container` names how the base's cells are held (`"object"` for a plain record keyed by
 * cell name, `"map"` for a `Map`).
 *
 * Returns the whole operation set, all of it derived from the supplied cell algebra and nothing
 * else: `merge` (pointwise join), `mergeAll` (its fold, empty settling as unit), `equalSettling`,
 * `leq` (a ≤ b iff joining a into b changes nothing), `settle` (the combinator above, bound),
 * `orbitMonotone`/`assertSettlingMonotone`/`guardSettlingMonotone` (the gate, bound to CELL
 * values), and `CellSettlement` (a per-cell committed-knowledge tracker whose every write is
 * guarded).
 *
 * @param {{ join: Function, equal: Function, bottom: any, container?: "object"|"map" }} cellAlgebra
 * @returns {SettlementAlgebra}
 */
export function settlementAlgebra({ join, equal, bottom, container = "object" } = {}) {
  if (typeof join !== "function") throw new TypeError("settlementAlgebra: join must be the cell fiber's knowledge join");
  if (typeof equal !== "function") throw new TypeError("settlementAlgebra: equal must be the cell fiber's equality");
  if (bottom === undefined) throw new TypeError("settlementAlgebra: bottom must be the cell fiber's least element");
  const held = containers[container];
  if (!held) throw new TypeError(`settlementAlgebra: unknown container ${JSON.stringify(container)}`);

  // a ≤ b iff joining a into b changes nothing — b already knows everything a knows.
  const leqCell = (a, b) => equal(join(a, b), b);

  // Pointwise knowledge-join of two settlings. A missing key defaults to bottom (nothing known),
  // so this is the join in the semilattice of settlings ordered cellwise by ≤.
  const merge = (a, b) => {
    const out = held.empty();
    const keys = new Set([...held.keys(a), ...held.keys(b)]);
    for (const key of keys) {
      held.set(out, key, join(held.has(a, key) ? held.get(a, key) : bottom, held.has(b, key) ? held.get(b, key) : bottom));
    }
    return out;
  };

  // Fold merge over many settlings (the empty settling is the unit).
  const mergeAll = (settlings) => {
    let acc = held.empty();
    for (const settling of settlings) acc = merge(acc, settling);
    return acc;
  };

  const equalSettling = (a, b) => {
    if (held.size(a) !== held.size(b)) return false;
    return held.keys(a).every((key) => held.has(b, key) && equal(held.get(a, key), held.get(b, key)));
  };

  const boundSettle = (step, start, options = {}) =>
    settle(step, start, { merge, equal: equalSettling, ...options });

  const boundOrbitMonotone = (orbit) => orbitMonotone(orbit, { leq: leqCell });
  const boundAssert = (orbit, options = {}) => assertSettlingMonotone(orbit, { ...options, leq: leqCell });
  const boundGuard = (before, after, options = {}) => guardSettlingMonotone(before, after, { ...options, leq: leqCell });

  // Per-cell committed knowledge state, tracked independently of any single caller's self-reported
  // "before" — the actual accumulated state the gate judges a proposed write against. Every
  // successful write only ever advances (or holds) a cell's knowledge order; a write that would
  // not is refused before it is recorded here, and before the caller's own event-log append.
  class CellSettlement {
    #state = new Map();

    valueOf(cell) {
      return this.#state.has(cell) ? this.#state.get(cell) : bottom;
    }

    write(cell, after) {
      const before = this.valueOf(cell);
      boundGuard(before, after, { cell });
      this.#state.set(cell, after);
      return after;
    }
  }

  return Object.freeze({
    join, equal, bottom, container,
    leqCell,
    merge,
    mergeAll,
    equalSettling,
    settle: boundSettle,
    orbitMonotone: boundOrbitMonotone,
    assertSettlingMonotone: boundAssert,
    guardSettlingMonotone: boundGuard,
    CellSettlement,
  });
}

// === the canonical FOUR instance ===============================================================
//
// The four readings (SignCell) under SignChain's knowledge join: no join, order, or equality is
// computed here; each of the three below is SignCell's or SignChain's own.

/** The cell algebra of FOUR: readings joined in the knowledge order. */
export const readingCellAlgebra = Object.freeze({
  join: knowledgeJoinReading,
  equal: samePoint,
  bottom: "absurd",
});

/** The settling algebra over FOUR, cells held in a plain record. */
export const readingSettlement = settlementAlgebra(readingCellAlgebra);
