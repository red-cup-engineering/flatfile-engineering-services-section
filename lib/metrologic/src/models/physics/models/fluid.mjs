/**
 * models/fluid - finite circulation H1.
 *
 * This captures `Obsmetrologia.Relational.Fluid.VortexCohomology`:
 * loop sums, vortex-loop circulation, gradient/exact flows, circulation
 * additivity, and the unit-vortex non-gradient obstruction.
 */

export function loopSum(velocity, size) {
  if (!Number.isSafeInteger(size) || size < 0) throw new RangeError("loopSum: size must be a natural number");
  let total = 0;
  for (let edge = 0; edge < size; edge += 1) total += velocity(edge);
  return total;
}

export function vortexLoop(size, velocity) {
  if (!Number.isSafeInteger(size) || size < 0) throw new RangeError("vortexLoop: size must be a natural number");
  return Object.freeze({
    kind: "relational.fluid.vortex.loop",
    size,
    velocity,
  });
}

export function circulation(loop) {
  return loopSum(loop.velocity, loop.size);
}

export function gradientVelocity(potential) {
  return (edge) => potential(edge + 1) - potential(edge);
}

export function isGradient(loop, potential) {
  if (potential(loop.size) !== potential(0)) return false;
  for (let edge = 0; edge < loop.size; edge += 1) {
    if (loop.velocity(edge) !== potential(edge + 1) - potential(edge)) return false;
  }
  return true;
}

export function gradientCirculationZero(loop, potential) {
  if (!isGradient(loop, potential) || circulation(loop) !== 0) throw new TypeError("gradientCirculationZero: gradient did not have zero circulation");
  return Object.freeze({
    kind: "relational.fluid.vortex.gradient_circulation_zero:witness",
    loop,
    circulation: 0,
    gradient: true,
    leanTheorem: "Obsmetrologia.Relational.Fluid.gradient_circulation_zero",
  });
}

export function circulationSuperpose(size, left, right) {
  const leftCirculation = loopSum(left, size);
  const rightCirculation = loopSum(right, size);
  const superposedCirculation = loopSum((edge) => left(edge) + right(edge), size);
  if (superposedCirculation !== leftCirculation + rightCirculation) throw new TypeError("circulationSuperpose: additivity failed");
  return Object.freeze({
    kind: "relational.fluid.vortex.circulation_superpose:witness",
    size,
    leftCirculation,
    rightCirculation,
    superposedCirculation,
    additive: true,
    leanTheorem: "Obsmetrologia.Relational.Fluid.circulation_superpose",
  });
}

export function unitVortex() {
  return vortexLoop(1, () => 1);
}

export function vortexObstruction(loop) {
  const charge = circulation(loop);
  if (charge === 0) throw new TypeError("vortexObstruction: circulation vanishes");
  return Object.freeze({
    kind: "relational.fluid.vortex.obstruction:witness",
    loop,
    circulation: charge,
    h1Nonzero: true,
    notGradient: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Fluid.vortex_obstruction_implies_H1_nonzero",
      "Obsmetrologia.Relational.Fluid.unitVortex_circulation",
      "Obsmetrologia.Relational.Fluid.unitVortex_not_gradient",
    ]),
  });
}

export function fluidVortexCohomologyReceipt() {
  const gradient = vortexLoop(2, gradientVelocity((node) => node === 1 ? 1 : 0));
  return Object.freeze({
    kind: "relational.fluid.vortex.receipt:witness",
    gradientZero: gradientCirculationZero(gradient, (node) => node === 1 ? 1 : 0),
    superpose: circulationSuperpose(2, (edge) => edge === 0 ? 1 : -1, () => 2),
    unit: vortexObstruction(unitVortex()),
    capturedLeanModule: "Obsmetrologia.Relational.Fluid.VortexCohomology",
  });
}
