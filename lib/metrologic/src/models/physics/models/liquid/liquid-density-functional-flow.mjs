/**
 * models/liquid/liquid-density-functional-flow - DFT descent as fixed point.
 *
 * This captures `Obsmetrologia.Relational.Liquid.DensityFunctionalFlow`:
 * rational free-energy descent, minimizer implies equilibrium, monotone
 * relaxation, initial-energy bound, and equilibrium orbits staying constant.
 */

export function dftFlow(
  states,
  omega,
  step,
) {
  const admitted = Object.freeze([...new Set(states)]);
  if (admitted.length === 0) throw new TypeError("dftFlow: expected at least one state");
  const known = new Set(admitted);
  for (const state of admitted) {
    if (!known.has(step(state))) throw new TypeError("dftFlow: step leaves state space");
    if (omega(step(state)) > omega(state)) throw new TypeError("dftFlow: step raises Omega");
    if (omega(step(state)) === omega(state) && step(state) !== state) throw new TypeError("dftFlow: equal-energy step did not settle");
  }
  return Object.freeze({
    kind: "relational.liquid.dft.flow",
    states: admitted,
    omega,
    step,
  });
}

export function dftIsEquilibrium(flow, state) {
  return flow.step(state) === state;
}

export function dftIsMinimizer(flow, state) {
  return flow.states.every((candidate) => flow.omega(state) <= flow.omega(candidate));
}

export function dftOrbit(flow, state, steps) {
  if (!Number.isSafeInteger(steps) || steps < 0) throw new RangeError("dftOrbit: expected a natural number of steps");
  let current = state;
  for (let index = 0; index < steps; index += 1) current = flow.step(current);
  return current;
}

export function dftFlowWitness(flow, minimizer) {
  if (!dftIsMinimizer(flow, minimizer) || !dftIsEquilibrium(flow, minimizer)) {
    throw new TypeError("dftFlowWitness: minimizer/equilibrium check failed");
  }
  const orbitNonIncreasing = flow.states.every((state) => flow.omega(dftOrbit(flow, state, 1)) <= flow.omega(state));
  const orbitBelowInitial = flow.states.every((state) => flow.omega(dftOrbit(flow, state, 3)) <= flow.omega(state));
  const equilibriumOrbitConstant = dftOrbit(flow, minimizer, 3) === minimizer;
  if (!orbitNonIncreasing || !orbitBelowInitial || !equilibriumOrbitConstant) {
    throw new TypeError("dftFlowWitness: orbit checks failed");
  }
  return Object.freeze({
    kind: "relational.liquid.dft.flow:witness",
    flow,
    minimizer,
    equilibrium: true,
    orbitNonIncreasing: true,
    orbitBelowInitial: true,
    equilibriumOrbitConstant: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Liquid.minimizer_is_equilibrium",
      "Obsmetrologia.Relational.Liquid.orbit_Omega_antitone",
      "Obsmetrologia.Relational.Liquid.orbit_Omega_le_init",
      "Obsmetrologia.Relational.Liquid.equilibrium_orbit_const",
    ]),
  });
}

export function settledDFTFlow() {
  return dftFlow(["rho"], () => 0, (state) => state);
}

export function liquidDensityFunctionalFlowReceipt() {
  const flow = settledDFTFlow();
  return Object.freeze({
    kind: "relational.liquid.dft.receipt:witness",
    settled: dftFlowWitness(flow, "rho"),
    capturedLeanModule: "Obsmetrologia.Relational.Liquid.DensityFunctionalFlow",
  });
}
