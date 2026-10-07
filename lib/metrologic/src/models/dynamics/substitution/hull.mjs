/**
 * settling/dynamics/substitution/hull - finite inverse-system hull helpers.
 *
 * The `mld` module reads a substitution through its finite colimit invariant.
 * This module exposes the geometric dual shape the Node package can execute:
 * finite inverse systems, finite coherent-thread checks, a canonical binary
 * odometer system at finite depth, and a seam from a substitution matrix back to
 * the same finite invariant.
 *
 * These helpers are deliberately bounded. They model the inverse-limit shape by
 * checking finite families of projections; they do not materialize an
 * uncountable Cantor hull, classify arbitrary tiling spaces, or prove
 * unbounded inverse-limit completeness. The useful product surface is the
 * carrier and judgment vocabulary: stage, restriction, thread witness, thread
 * obstruction, finite-cylinder separation, and hull-to-invariant seam.
 *
 * Grounding: `lean/RelMath/Aperiodic/InverseHull.lean` and the surrounding
 * Anderson-Putnam/aperiodic RelMath spine. The public authority here is the
 * finite inverse-system behavior implemented below.
 *
 * @packageDocumentation
 */
import { mldInvariant } from "./mld.mjs";
import {} from "./index.mjs";
/** Whether a finite family is coherent under each consecutive restriction. */
export function coherentThread(system, values, equal) {
    for (let level = 0; level + 1 < values.length; level += 1) {
        const restricted = system.restrict(level, level + 1, values[level + 1]);
        if (!equal(restricted, values[level])) {
            return Object.freeze({ kind: "substitution.dynamics.hull.thread-obstruction", atStage: level, expected: restricted, found: values[level] });
        }
    }
    return Object.freeze({ kind: "substitution.dynamics.hull.thread:witness", values: Object.freeze([...values]) });
}
/** Whether two finite threads agree at every visible projection. */
export function threadsSeparated(left, right, equal) {
    return left.length === right.length && left.every((value, level) => equal(value, right[level]));
}
/** A finite-depth binary odometer inverse system using prefix restriction. */
export function odometerHull() {
    const words = (length) => {
        if (length === 0)
            return [""];
        const shorter = words(length - 1);
        return Object.freeze(shorter.flatMap((word) => [`${word}0`, `${word}1`]));
    };
    return Object.freeze({
        kind: "substitution.dynamics.hull.inverseSystem",
        stage: (level) => words(level),
        restrict: (lower, _upper, value) => value.slice(0, lower),
    });
}
/** A constant inverse system whose every stage carries the same finite invariant. */
export function constantHull(invariant) {
    return Object.freeze({
        kind: "substitution.dynamics.hull.inverseSystem",
        stage: () => Object.freeze([invariant]),
        restrict: (_lower, _upper, value) => value,
    });
}
/** Read the finite invariant exposed at the hull/colimit seam for a matrix. */
export function hullSeam(matrix) {
    return mldInvariant(matrix);
}
