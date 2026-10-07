// equality.mjs — equality, DERIVED rather than postulated: Lawvere's diagonal-Σ construction, run over
// the existing hyperdoctrine adjoints. OPT-IN, opt-in-of-an-opt-in: this consumes
// @red-cup-engineering/metrologic/hyperdoctrine's `existsAlong`/`orderOps`, which nothing in `bilattice`
// depends on, and nothing in `hyperdoctrine` depends on this in turn.
//
// Ported from `Obsmetrologia/Language/Predicating/Equality.lean` (obsmetrologia, Lean 4), which derives
// two equalities from the SAME general fact — that a predication hyperdoctrine carries two parallel
// adjoint systems, `∃^k ⊣ f* ⊣ ∀^k` in the knowledge order and `∃^t ⊣ f* ⊣ ∀^t` in the truth order — by
// taking `∃` along the diagonal `g : E → E×E, e ↦ (e,e)` of the entity terminal `1` (the fiber over `E`
// that is constant at the order's designated/top reading):
//
//   classical equality       =_E   := ∃^t_g(1^t)   (truth order)
//   paraconsistent equality  Δ^k_E := ∃^k_g(1^k)   (knowledge order)
//
// `existsAlong`'s general law — join over the fiber `g⁻¹(pair)`, and the order's ⊥ where that fiber is
// empty — does the rest with NO equality-specific case analysis here: `g⁻¹(s,o)` is the singleton `{s}`
// when `s = o` (there is exactly one entity mapping to the diagonal point `(s,o)`) and empty otherwise,
// so `existsAlong` reads off `top` on the diagonal and `bottom` off it automatically. `s = o` is
// ordinary JS `===` used only to BUILD the diagonal morphism's fiber structure (which entity maps to
// which pair) — the actual t/f resp. ⊤/⊥ verdict is read out of `existsAlong`'s join, not written down
// by hand at the call site. This is why the two equalities agree on WHERE they hold (the diagonal) while
// differing in WHAT reading lands there (truth poles vs. knowledge poles) — same construction, two orders.
import { existsAlong } from "../hyperdoctrine/adjoints.mjs";
import { orderOps, KNOWLEDGE, TRUTH } from "../hyperdoctrine/order.mjs";

/** @typedef {import("../hyperdoctrine/order.mjs").OrderOps} OrderOps */
/** @typedef {import("../hyperdoctrine/morphism.mjs").IndexMorphism} IndexMorphism */
/** @typedef {import("../hyperdoctrine/morphism.mjs").Fiber} Fiber */

/**
 * The pair-key a fiber over `E×E` is addressed by — `pairKey(s, o)` is the target-index key standing
 * for the pair `(s, o)`. `JSON.stringify` (not a delimiter join) so entity keys may contain any
 * characters, including the delimiter itself, without collision.
 * @param {string} s @param {string} o @returns {string}
 */
export function pairKey(s, o) {
  return JSON.stringify([s, o]);
}

/**
 * All pair-keys over a finite entity list — the target index set `E×E` the diagonal morphism lands in.
 * @param {string[]} entities @returns {string[]}
 */
export function pairKeys(entities) {
  const out = [];
  for (const s of entities) for (const o of entities) out.push(pairKey(s, o));
  return out;
}

/**
 * The Lawvere diagonal `g : E → E×E, e ↦ (e, e)`, as an `IndexMorphism` over a finite entity list —
 * the base map `∃_g` is taken along in both `classicalEquality` and `paraconsistentEquality`. Exposed
 * so the derivation can be inspected directly: `g`'s preimage of `(s, o)` is `{s}` when `s = o`, empty
 * otherwise, which is the whole of what makes the two equalities come out two-valued off a single join.
 * @param {string[]} entities @returns {IndexMorphism}
 */
export function diagonalMorphism(entities) {
  return { source: entities.slice(), target: pairKeys(entities), map: (e) => pairKey(e, e) };
}

/**
 * The diagonal terminal `1^order` — the fiber over `E` constant at the order's designated (top) reading,
 * the thing `∃_g` is applied to. `1^t` (`TRUTH`) for classical equality, `1^k` (`KNOWLEDGE`) for
 * paraconsistent equality.
 * @param {string[]} entities @param {string} order @returns {Fiber}
 */
function diagonalTerminal(entities, order) {
  const top = orderOps(order).top;
  return new Map(entities.map((e) => [e, top]));
}

/**
 * Equality along the diagonal, taken at either order — `∃^order_g(1^order)`, the one construction both
 * `classicalEquality` (`order = TRUTH`) and `paraconsistentEquality` (`order = KNOWLEDGE`) instantiate.
 * Exported so a caller building further derived predicates can reuse the exact adjoint route rather
 * than re-deriving it per order, the way `Equality.lean`'s `classicalEq`/`paraconsistentEq` share one
 * shape across `joinTList`/`joinList`.
 * @param {string[]} entities @param {string} order @returns {Fiber} a Fiber over `pairKeys(entities)`
 */
export function equalityAlongDiagonal(entities, order) {
  const g = diagonalMorphism(entities);
  const one = diagonalTerminal(entities, order);
  return existsAlong(g, one, order);
}

/**
 * **Classical equality**, `=_E := ∃^t_g(1^t)` — the truth-order existential image of the diagonal
 * `t`-terminal. `classicalEquality(entities).get(pairKey(s, o))` is the truth order's `top` (`t`) where
 * `s = o` and its `bottom` (`f`) otherwise — two-valued, DERIVED from `existsAlong`'s general join/⊥
 * law rather than written down as an `if`.
 * @param {string[]} entities @returns {Fiber}
 */
export function classicalEquality(entities) {
  return equalityAlongDiagonal(entities, TRUTH);
}

/**
 * **Paraconsistent equality**, `Δ^k_E := ∃^k_g(1^k)` — the knowledge-order existential image of the
 * diagonal `⊤`-terminal. `paraconsistentEquality(entities).get(pairKey(s, o))` is the knowledge order's
 * `top` (`⊤`, information-maximal) where `s = o` and its `bottom` (`⊥`, no claim) otherwise — DERIVED
 * the same way, one order over.
 * @param {string[]} entities @returns {Fiber}
 */
export function paraconsistentEquality(entities) {
  return equalityAlongDiagonal(entities, KNOWLEDGE);
}

/**
 * Read a derived-equality fiber (the result of `classicalEquality`/`paraconsistentEquality`/
 * `equalityAlongDiagonal`) at the pair `(s, o)` — `fiber.get(pairKey(s, o))` spelled out so call sites
 * don't have to know the pair-key encoding.
 * @param {Fiber} fiber @param {string} s @param {string} o @returns {string} a knowledge-family reading name from four.mjs (absurd/potential/active/stable)
 */
export function equalityAt(fiber, s, o) {
  return fiber.get(pairKey(s, o));
}
