/**
 * closure-regime — Obsmetrologia's `ClosureRegime` as data: the four strata of a closure
 * ordinal κ at the boundaries ω and ω₁, one per corner of FOUR.
 *
 *   strict               κ < ω       finite base
 *   scott                κ = ω       Scott-continuous closure
 *   transfinite-bounded  ω < κ < ω₁  non-Scott, countable cofinality
 *   aperiodic            κ ≥ ω₁      non-Scott, uncountable cofinality
 *
 * The names are listed in completion-cost order (`regimeCost`), so a regime's cost is its
 * place in the list. A regime's completion is decidable when it settles by κ ≤ ω, which is
 * strict and scott (`regimeDecidable`). Reading a regime off an ordinal or closure data is
 * metrologic's work; this module only names the four values, as FOUR names its points.
 */

/** The four closure regimes by their Obsmetrologia names, in completion-cost order. */
export const closureRegimeNames = Object.freeze(["strict", "scott", "transfinite-bounded", "aperiodic"]);

const scottCost = closureRegimeNames.indexOf("scott");

/** Whether a name is a closure regime's name. */
export const isClosureRegimeName = (name) => closureRegimeNames.includes(name);

function admitted(name, verb) {
  if (!isClosureRegimeName(name)) throw new TypeError(`${verb}: not a closure regime name: ${JSON.stringify(name)}`);
  return name;
}

/** A regime's completion cost: its closure-ordinal class's height (Lean `regimeCost`). */
export const regimeCost = (name) => closureRegimeNames.indexOf(admitted(name, "regimeCost"));

/** Whether a regime's completion is decidable: it settles by κ ≤ ω (Lean `regimeDecidable`). */
export const regimeDecidable = (name) => regimeCost(name) <= scottCost;

/** The costlier of two regimes. */
export const costlierRegime = (left, right) => (regimeCost(right) > regimeCost(left) ? right : left);

/** The JSON Schema of a regime name. */
export const closureRegimeSchema = Object.freeze({ enum: closureRegimeNames });
