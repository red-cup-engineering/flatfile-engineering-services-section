/**
 * closure-regime — Obsmetrologia's `ClosureRegime` as data: the four strata of a closure
 * ordinal κ at the boundaries ω and ω₁, one per corner of FOUR.
 *
 *   strict               κ < ω       finite base
 *   scott                κ = ω       Scott-continuous closure
 *   transfinite-bounded  ω < κ < ω₁  non-Scott, countable cofinality
 *   aperiodic            κ ≥ ω₁      non-Scott, uncountable cofinality
 *
 * The names are listed in ordinal-class order (`regimeCost`). Reaching a fixed
 * point at ordinal ω does NOT imply finite-stage decidability: the Scott rung
 * can have strictly increasing finite iterates and a limit-stage fixed point.
 *
 * Obsmetrologia.Closure.Regime.cohomologyVanishes, separately, holds on the
 * strict and Scott rungs. Do not confuse its H¹-vanishing classification
 * with a guarantee that iteration halts after finitely many steps.
 * Reading a regime off actual closure data belongs to Metrologic.
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

/** The finite-stage settlement guarantee supplied by the regime alone:
 * only strict (κ < ω) ensures a fixed point is attained at some finite step.
 * This is not a generic termination guarantee for arbitrary unbounded keys. */
export const regimeDecidable = (name) => regimeCost(name) === 0;

/** The Boolean regime table from
 * Obsmetrologia.Closure.Regime.cohomologyVanishes: true on strict and Scott.
 * This readout is NOT a computed H¹ group for an arbitrary supplied sheaf. */
export const regimeCohomologyVanishes = (name) => regimeCost(name) <= scottCost;

/** The costlier of two regimes. */
export const costlierRegime = (left, right) => (regimeCost(right) > regimeCost(left) ? right : left);

/** The JSON Schema of a regime name. */
export const closureRegimeSchema = Object.freeze({ enum: closureRegimeNames });
