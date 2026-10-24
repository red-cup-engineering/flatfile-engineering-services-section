/**
 * Exact finite fluid-circulation projection of the current
 * Obsmetrologia.KineticTheory.Fluid.VortexCohomology Int-cochain laws.
 *
 * The source Lean VortexLoop is an oriented finite Nat-indexed Z cochain.
 * Binary64 sums and callback closures are not valid proof witnesses for Z:
 * NaN, Infinity and rounding can falsely assert nonzero H1. We materialize
 * each finite cochain once, retain canonical integer coordinates and return
 * JSON-readable exact signed decimal results. These are checked finite
 * mathematical projections, NOT physical measurements or Lean kernel checks.
 *
 * Original law: Obsmetrologia/KineticTheory/Fluid/VortexCohomology.lean
 * Exact host integer codec: Metrologic number/wire-ratio (Data-owned).
 */
import { hostRatio } from "../../../number/wire-ratio.mjs";

const KIND = "relational.fluid.vortex.loop";
const MAX_EDGES = 16384;
const MAX_DIGITS = 128;

function sizeOf(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_EDGES)
    throw new RangeError("finite vortex loop size must be a natural number at most 16384");
  return value;
}

/** Canonical decimal Int carriers. No unsafe number, host float or nonfinite. */
function integer(value, label) {
  if (typeof value === "string" && value.length > MAX_DIGITS + 1)
    throw new RangeError(label + " exceeds 128 integer digits");
  if (typeof value === "bigint" && value.toString().replace(/^-/, "").length > MAX_DIGITS)
    throw new RangeError(label + " exceeds 128 integer digits");
  // Reuse the Metrologic exact integer boundary; denominator is fixed at 1.
  const canonical = hostRatio(value).numerator;
  if (typeof value === "string" && value !== canonical)
    throw new TypeError(label + " must have canonical signed decimal spelling");
  if (canonical.replace(/^-/, "").length > MAX_DIGITS)
    throw new RangeError(label + " exceeds 128 integer digits");
  return BigInt(canonical);
}

function samples(values, count, label) {
  if (typeof values !== "function" &&
      (!Array.isArray(values) || values.length !== count))
    throw new TypeError(label + " must supply one value at each finite coordinate");
  const result = [];
  for (let i = 0; i < count; i++) {
    // A sparse array or accessor can change the observation on reread.
    // Admit only material data slots; callbacks are sampled once and then
    // discarded by vortexLoop, never retained as proof-bearing carriers.
    const slot = typeof values === "function" ? undefined
      : Object.getOwnPropertyDescriptor(values, String(i));
    if (typeof values !== "function" && (!slot || !Object.hasOwn(slot, "value")))
      throw new TypeError(label + " has a missing or accessor-backed finite coordinate");
    result.push(integer(typeof values === "function" ? values(i) : slot.value, label));
  }
  return Object.freeze(result);
}

function admitLoop(loop) {
  // Qualified results must not refer to a caller-owned object which can be
  // changed AFTER the nonzero obstruction has been checked. Snapshot the
  // exact cochain once and use that same snapshot for both arithmetic and
  // returned witnesses. Reject accessor-backed source fields, not just NaN.
  if (loop === null || typeof loop !== "object" || Array.isArray(loop))
    throw new TypeError("finite vortex loop requires a complete materialized cochain");
  const kind = Object.getOwnPropertyDescriptor(loop, "kind");
  const sizeField = Object.getOwnPropertyDescriptor(loop, "size");
  const velocity = Object.getOwnPropertyDescriptor(loop, "velocity");
  if (![kind, sizeField, velocity].every(field => field && Object.hasOwn(field, "value"))
      || kind.value !== KIND)
    throw new TypeError("finite vortex loop requires own data fields");
  const size = sizeOf(sizeField.value);
  if (!Array.isArray(velocity.value) || velocity.value.length !== size)
    throw new TypeError("finite vortex loop requires a complete materialized cochain");
  return Object.freeze({size, values:samples(velocity.value, size, "vortex velocity")});
}

const snapshotOf = observed => Object.freeze({
  kind:KIND, size:observed.size,
  velocity:Object.freeze(observed.values.map(String)),
});

const sum = values => values.reduce((total, value) => total + value, 0n);

/** Finite Int-valued circulation, returned as a canonical JSON integer. */
export function loopSum(velocity, size) {
  return sum(samples(velocity, sizeOf(size), "vortex velocity")).toString();
}

/** Sample callbacks ONCE. The witnessed cochain can be replayed without code. */
export function vortexLoop(size, velocity) {
  const n = sizeOf(size);
  const values = samples(velocity, n, "vortex velocity");
  return Object.freeze({
    kind: KIND, size: n,
    velocity: Object.freeze(values.map(String)),
  });
}

export function circulation(loop) {
  return sum(admitLoop(loop).values).toString();
}

/** Source-gradient presentation; its sampled vortexLoop is the durable cochain. */
export function gradientVelocity(potential) {
  if (typeof potential !== "function")
    throw new TypeError("gradient velocity requires a potential function");
  return edge => {
    if (!Number.isSafeInteger(edge) || edge < 0 || edge >= MAX_EDGES)
      throw new RangeError("gradient edge is outside finite bounds");
    return (integer(potential(edge + 1), "potential") -
      integer(potential(edge), "potential")).toString();
  };
}

function gradientOf(loop, potential) {
  const observed = admitLoop(loop);
  // One read per node, including the closing point. The potential is a
  // finite source presentation, not an independently authenticated issuer.
  const nodes = samples(potential, observed.size + 1, "vortex potential");
  const closes = nodes[observed.size] === nodes[0];
  const matches = observed.values.every((value, i) => value === nodes[i + 1] - nodes[i]);
  return Object.freeze({
    closes, matches, loop:snapshotOf(observed),
    circulation:sum(observed.values).toString(),
    potential:Object.freeze(nodes.map(String)),
  });
}

export function isGradient(loop, potential) {
  const proof = gradientOf(loop, potential);
  return proof.closes && proof.matches;
}

export function gradientCirculationZero(loop, potential) {
  const proof = gradientOf(loop, potential);
  if (!proof.closes || !proof.matches || proof.circulation !== "0")
    throw new TypeError("gradientCirculationZero: exact closed gradient did not have zero circulation");
  return Object.freeze({
    kind: "relational.fluid.vortex.gradient_circulation_zero:witness",
    loop:proof.loop, potential: proof.potential, circulation: "0", gradient: true,
    leanTheorem: "Obsmetrologia.KineticTheory.Fluid.gradient_circulation_zero",
    qualification: "exact-finite-int-projection-not-kernel-or-physical-receipt",
  });
}

export function circulationSuperpose(size, left, right) {
  const a = vortexLoop(size, left), b = vortexLoop(size, right);
  const combined = vortexLoop(a.size, a.velocity.map((value, i) =>
    (BigInt(value) + BigInt(b.velocity[i])).toString()));
  const leftCirculation = circulation(a), rightCirculation = circulation(b);
  const superposedCirculation = circulation(combined);
  if (BigInt(superposedCirculation) !== BigInt(leftCirculation) + BigInt(rightCirculation))
    throw new TypeError("circulationSuperpose: exact additive law failed");
  return Object.freeze({
    kind: "relational.fluid.vortex.circulation_superpose:witness",
    size:a.size,left:a,right:b,combined,
    leftCirculation,rightCirculation,superposedCirculation,additive:true,
    leanTheorem: "Obsmetrologia.KineticTheory.Fluid.circulation_superpose",
    qualification: "exact-finite-int-projection-not-kernel-or-physical-receipt",
  });
}

export function unitVortex() {
  return vortexLoop(1, ["1"]);
}

export function vortexObstruction(loop) {
  const observed = admitLoop(loop);
  const charge = sum(observed.values).toString();
  if (charge === "0")
    throw new TypeError("vortexObstruction: exact circulation vanishes");
  return Object.freeze({
    kind:"relational.fluid.vortex.obstruction:witness",
    loop:snapshotOf(observed),circulation:charge,h1Nonzero:true,notGradient:true,
    // The unit-vortex-specific Lean theorems do NOT apply to arbitrary loops.
    leanTheorems:Object.freeze([
      "Obsmetrologia.KineticTheory.Fluid.vortex_obstruction_implies_H1_nonzero",
    ]),
    qualification:"exact-finite-int-projection-not-kernel-or-physical-receipt",
  });
}

export function fluidVortexCohomologyReceipt() {
  const potential = node => node === 1 ? 1 : 0;
  const gradient = vortexLoop(2, gradientVelocity(potential));
  const unit = vortexObstruction(unitVortex());
  return Object.freeze({
    kind:"relational.fluid.vortex.receipt:witness",
    gradientZero:gradientCirculationZero(gradient,potential),
    superpose:circulationSuperpose(2, edge => edge === 0 ? 1 : -1, () => 2),
    unit,
    // These two proofs are conditional on the actual unitVortex above.
    unitLeanTheorems:Object.freeze([
      "Obsmetrologia.KineticTheory.Fluid.unitVortex_circulation",
      "Obsmetrologia.KineticTheory.Fluid.unitVortex_not_gradient",
    ]),
    capturedLeanModule:"Obsmetrologia.KineticTheory.Fluid.VortexCohomology",
    qualification:"source-checked-finite-exact-projection-no-installed-lean-or-physical-assay",
  });
}
