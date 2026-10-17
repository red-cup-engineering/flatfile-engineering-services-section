/**
 * The ordinal chain omega+1 and its paraconsistent linear twist product.
 *
 * DOWNSTREAM of Obsmetrologia's source-generated Marks/Positing. This is an
 * explicit value-category experiment, not a new generative mathematical floor.
 * The carrier L = {0,1,2,...,omega} has countably many values including omega;
 * finite ordinals are canonical decimal strings and omega is "ω". Its complete
 * Gödel/Heyting chain takes fusion=meet, top=unit=omega and
 * (a -> b) = omega if a<=b, otherwise b.
 *
 * Reuse the ORIGINAL generic Data-owned twistProduct in ./four.mjs. FOUR is
 * exactly the {0,omega} endpoint subalgebra, not this entire L-twist.
 *
 * Evidence grades and the closure ordinal of a computation are different
 * types. No ordinal-valued datum here certifies an omega-step computation,
 * non-Scott continuity, witness provenance, or linear sequent derivability.
 */
import { readingOfSides, twistProduct } from "./four.mjs";

export const OMEGA = "ω";

const decimal = /^(?:0|[1-9][0-9]*)$/u;

/** Exact, JSON-safe canonical value of one ordinal <= omega; no machine-integer cap. */
export function omegaGrade(value) {
  if (typeof value !== "string" || (value !== OMEGA && !decimal.test(value)))
    throw new TypeError("omega twist: grade must be a canonical natural-ordinal string or ω");
  return value;
}

/** Ordinal order: natural numbers less than omega, all by exact BigInt comparison. */
export function omegaCompare(left, right) {
  const a = omegaGrade(left), b = omegaGrade(right);
  if (a === b) return 0;
  if (a === OMEGA) return 1;
  if (b === OMEGA) return -1;
  const an = BigInt(a), bn = BigInt(b);
  return an < bn ? -1 : an > bn ? 1 : 0;
}
const leq = (a, b) => omegaCompare(a, b) <= 0;
const meet = (a, b) => leq(a, b) ? omegaGrade(a) : omegaGrade(b);
const join = (a, b) => leq(a, b) ? omegaGrade(b) : omegaGrade(a);
const imply = (a, b) => leq(a, b) ? OMEGA : omegaGrade(b);
const dualImply = (a, b) => leq(b, a) ? "0" : omegaGrade(b);

/** Integral commutative complete Gödel/Heyting chain L = omega+1. */
export const omegaChain = Object.freeze({
  bottom: "0", top: OMEGA, one: OMEGA, leq, meet, join, fuse: meet, imply,
});

/** Original native parametric twist algebra L^bowtie, never FOUR copied by hand. */
export const omegaTwist = twistProduct(omegaChain);

/** A canonical paraconsistent value [positiveGrade, negativeGrade]. */
export const omegaEvidence = (positive = "0", negative = "0") =>
  omegaTwist.value(omegaGrade(positive), omegaGrade(negative));

export function checkedOmegaEvidence(value) {
  if (!Array.isArray(value) || value.length !== 2)
    throw new TypeError("omega twist: evidence must be a two-coordinate ordinal pair");
  return omegaEvidence(value[0], value[1]);
}

/** Projection to the original FOUR information-support shadow, not value equality. */
export function omegaSupportReading(value) {
  const pair = checkedOmegaEvidence(value);
  return readingOfSides("knowledge", pair[0] !== "0", pair[1] !== "0");
}

/** Both bilattice orders over L^bowtie. */
export function omegaWithin(order, a, b) {
  const left = checkedOmegaEvidence(a), right = checkedOmegaEvidence(b);
  if (order === "knowledge") return omegaTwist.leqKnowledge({ left, right });
  if (order === "truth") return omegaTwist.leqTruth({ left, right });
  throw new TypeError("omega twist: order must be knowledge or truth");
}

/** Choose the native additive or multiplicative law; linear and Heyting
 * implications are NOT the same operation and are never selected by a default. */
export function omegaBinary(operation, left, right, order) {
  const a = checkedOmegaEvidence(left), b = checkedOmegaEvidence(right);
  const args = { left: a, right: b };
  if (operation === "tensor" || operation === "lollipop" || operation === "par") {
    if (order !== undefined)
      throw new TypeError("omega twist: multiplicative linear operators have no additional Heyting order");
    if (operation === "tensor") return omegaTwist.fuse(args);
    if (operation === "lollipop") return omegaTwist.imply(args);
    return omegaLinearNot(omegaTwist.fuse({
      left: omegaLinearNot(a), right: omegaLinearNot(b),
    }));
  }
  if (order !== "knowledge" && order !== "truth")
    throw new TypeError("omega twist: a Heyting operation needs a declared order");
  if (operation === "join") return (order === "knowledge" ? omegaTwist.joinKnowledge : omegaTwist.joinTruth)(args);
  if (operation === "meet") return (order === "knowledge" ? omegaTwist.meetKnowledge : omegaTwist.meetTruth)(args);
  if (operation === "imply") return omegaEvidence(
    imply(a[0], b[0]),
    order === "knowledge" ? imply(a[1], b[1]) : dualImply(a[1], b[1]),
  );
  throw new TypeError("omega twist: unknown binary operation " + String(operation));
}

/** Multiplicative / Chu-negation: the same two grades in opposite roles. */
export const omegaLinearNot = (value) => omegaTwist.negate(checkedOmegaEvidence(value));

/** Nonempty family folds. No absent/unobserved family is declared a theorem. */
export function omegaFold(quantifier, order, values) {
  if (!Array.isArray(values) || values.length === 0)
    throw new TypeError("omega twist: quantification needs an explicit nonempty value family");
  if (quantifier !== "some" && quantifier !== "all")
    throw new TypeError("omega twist: quantifier must be some or all");
  if (order !== "knowledge" && order !== "truth")
    throw new TypeError("omega twist: quantifier needs knowledge or truth order");
  const operation = quantifier === "some" ? "join" : "meet";
  return values.map(checkedOmegaEvidence)
    .reduce((acc, current) => omegaBinary(operation, acc, current, order));
}
