/**
 * settling/dynamics/substitution/mld - finite MLD-invariant comparisons.
 *
 * This module names the mutually-locally-derivable reading that the Node package
 * can currently execute: compare the finite cohomological invariant carried by
 * two substitution incidence matrices. The invariant is the same structure
 * returned by {@link colimStructure}: rank, determinant, Smith normal form,
 * stable determinant, and localized integer module.
 *
 * The result stays in the package's witness/obstruction idiom. Equal invariants
 * produce a `substitution.dynamics.mld:witness`; unequal invariants produce an
 * obstruction naming the first separating component. This is useful as the
 * implemented Anderson-Putnam-classifier layer. It is not an arbitrary tiling
 * equivalence solver, and it does not construct local derivation maps between
 * raw tilings.
 *
 * Grounding: `lean/RelMath/Aperiodic/StepN/*`, the RelMath aperiodic import
 * spine, and the content aperiodic-regime classification notes. The public
 * authority here is the finite invariant comparison implemented below.
 *
 * @packageDocumentation
 */
import { abelianize, colimStructure, } from "./index.mjs";
import { intEqual, natEqual, } from "@red-cup-engineering/exact-number-data-service/exact-number";
/** The colimit invariant of a substitution incidence matrix, named in its MLD role. */
export function mldInvariant(matrix) {
    return colimStructure(matrix);
}
/** Whether two finite MLD invariants agree component-by-component. */
function sameInvariant(left, right) {
    return natEqual(left.rank, right.rank)
        && intEqual(left.det, right.det)
        && intEqual(left.stableDet, right.stableDet)
        && left.smith.length === right.smith.length
        && left.smith.every((factor, index) => intEqual(factor, right.smith[index]))
        && natEqual(left.module.rank, right.module.rank)
        && left.module.invertedPrimes.length === right.module.invertedPrimes.length
        && left.module.invertedPrimes.every((prime, index) => intEqual(prime, right.module.invertedPrimes[index]));
}
/** The separating component of two differing invariants, checked coarse to fine. */
function mldObstructionReason(left, right) {
    if (!natEqual(left.rank, right.rank))
        return "rank";
    if (!intEqual(left.det, right.det) || !intEqual(left.stableDet, right.stableDet))
        return "determinant";
    if (left.smith.length !== right.smith.length || !left.smith.every((factor, index) => intEqual(factor, right.smith[index])))
        return "smith-normal-form";
    return "localized-module";
}
/** Compare two substitution incidence matrices by the finite MLD invariant. */
export function mutuallyLocallyDerivable(left, right) {
    const leftInvariant = mldInvariant(left);
    const rightInvariant = mldInvariant(right);
    return sameInvariant(leftInvariant, rightInvariant)
        ? Object.freeze({ kind: "substitution.dynamics.mld:witness", left: leftInvariant, right: rightInvariant })
        : Object.freeze({ kind: "substitution.dynamics.mld-obstruction", reason: mldObstructionReason(leftInvariant, rightInvariant), left: leftInvariant, right: rightInvariant });
}
/** Compare two substitution carriers by abelianizing over their own alphabets first. */
export function carriersMutuallyLocallyDerivable(left, right) {
    return mutuallyLocallyDerivable(abelianize(left.rule, left.alphabet), abelianize(right.rule, right.alphabet));
}
