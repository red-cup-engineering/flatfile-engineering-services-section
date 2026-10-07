/**
 * thermodynamics - temperature as balanced contradiction flux.
 *
 * This module is the MetroPlat realization of `Obsmetrologia.Thermodynamics.Temperature`.
 * It does not introduce a physical simulator. It retains the same upstream
 * evidence as the Lean module: top-creation source, stochastic balance,
 * load-bearing Landauer support, and hard-flow free-energy discharge.
 *
 * @packageDocumentation
 */
import {
  dihedral,
  dihedralElementNames,

} from "../../../articulation/predicating/positing/dihedral-gauge.mjs";
import {
  advance,
  detailedBalance,
  isStationary,
  rowsSumToOne,

} from "../../../articulation/predicating/positing/settling/stochastic.mjs";
import { landauerEntropyReceipt } from "../../../articulation/predicating/positing/settling/analysis/coordination-cohomology.mjs";
import { coverNerve } from "../../../articulation/predicating/positing/settling/analysis/coordination-cohomology.mjs";
import {
  closureToStableOperator,
  freeEnergyLyapunov,
  valuation,

} from "../../../articulation/predicating/positing/settling/analysis/flow.mjs";

const assertNat = (name, value) => {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${name} must be a safe natural number`);
  return value;
};

export function gaugeTopCreationCount(value) {
  const charge = typeof value === "string" ? value : value;
  const orbit = Object.freeze(dihedralElementNames.map((element) => dihedral(element, charge)));
  const count = orbit.filter((name) => name === "stable").length;
  const d8Length = dihedralElementNames.length;
  if (count <= 0 || count * 4 !== d8Length) {
    throw new TypeError("gaugeTopCreationCount: D8 held-top quarter-rate failed");
  }
  return Object.freeze({
    kind: "thermodynamics.temperature.topCreation.gauge",
    charge,
    orbit,
    count,
    d8Length,
    quarterRate: true,
    leanTheorem: "Obsmetrologia.Thermodynamics.Temperature.gauge_top_creation_quarter",
  });
}

export function collisionTopMint(positive, negative, target) {
  if (positive.length === 0 || negative.length === 0 || target.length === 0) {
    throw new TypeError("collisionTopMint: positive, negative, and target must be named");
  }
  return Object.freeze({
    kind: "thermodynamics.temperature.topCreation.collision",
    positive,
    negative,
    target,
    count: 1,
    minted: "stable",
    leanTheorem: "Obsmetrologia.Thermodynamics.Temperature.collision_top_minted",
  });
}

export function topCreationCount(source) {
  return source.count;
}

export function topFlux(semiring, creation, discharge) {
  return Object.freeze({
    kind: "thermodynamics.temperature.topFlux",
    creation,
    discharge,
    balanced: semiring.eq(creation, discharge),
  });
}

export function balancedTemperature(flux) {
  if (!flux.balanced) throw new TypeError("balancedTemperature: creation and discharge differ");
  return flux.discharge;
}

export function balancedTemperatureWitness(flux) {
  return Object.freeze({
    kind: "thermodynamics.temperature.balancedTemperature:witness",
    flux,
    temperature: balancedTemperature(flux),
    unique: true,
    leanTheorem: "Obsmetrologia.Thermodynamics.Temperature.balancedTemperature_unique",
  });
}

export function stationaryFlux(
  kernel,
  semiring,
  distribution,
  state,
) {
  return topFlux(semiring, advance(kernel, semiring, distribution)(state), distribution(state));
}

export function stationaryTopState(
  kernel,
  semiring,
  distribution,
  state,
) {
  if (!isStationary(kernel, semiring, distribution)) throw new TypeError("stationaryTopState: distribution is not stationary");
  const flux = stationaryFlux(kernel, semiring, distribution, state);
  const temperature = balancedTemperature(flux);
  if (!semiring.eq(temperature, distribution(state))) {
    throw new TypeError("stationaryTopState: temperature did not equal distribution at state");
  }
  return Object.freeze({
    kind: "thermodynamics.temperature.stationaryTopState",
    kernel,
    semiring,
    distribution,
    state,
    stationary: true,
    flux,
    temperature,
    temperatureEqDistribution: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Thermodynamics.Temperature.stationary_flux_balanced",
      "Obsmetrologia.Thermodynamics.Temperature.stationary_temperature_eq_distribution",
      "Obsmetrologia.Thermodynamics.Temperature.stationary_temperature_unique",
    ]),
  });
}

export function detailedBalancedTopState(
  kernel,
  semiring,
  distribution,
  state,
) {
  if (!detailedBalance(kernel, semiring, distribution)) throw new TypeError("detailedBalancedTopState: detailed balance failed");
  if (!rowsSumToOne(kernel, semiring)) throw new TypeError("detailedBalancedTopState: rows do not sum to one");
  return Object.freeze({
    kind: "thermodynamics.temperature.detailedBalancedTopState",
    stationary: stationaryTopState(kernel, semiring, distribution, state),
    detailedBalance: true,
    rowsSumToOne: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Thermodynamics.Temperature.detailed_balance_stationary_flux_balanced",
      "Obsmetrologia.Thermodynamics.Temperature.detailed_balance_temperature_eq_distribution",
      "Obsmetrologia.Thermodynamics.Temperature.detailed_balance_temperature_unique",
    ]),
  });
}

export function landauerLedger(nerve) {
  return nerve.components - (nerve.cells + nerve.components - nerve.entities);
}

export function landauerSupport(nerve = coverNerve(3, 3, 1)) {
  const receipt = landauerEntropyReceipt(nerve);
  const cost = assertNat("landauer cost", receipt.bits);
  if (cost <= 0) throw new TypeError("landauerSupport: support is not load-bearing");
  const ledger = landauerLedger(nerve);
  const eulerCharacteristic = nerve.entities - nerve.cells;
  if (ledger !== eulerCharacteristic) throw new TypeError("landauerSupport: ledger did not equal Euler characteristic");
  return Object.freeze({
    kind: "thermodynamics.temperature.landauerSupport",
    receipt,
    cost,
    costPositive: true,
    ledger,
    eulerCharacteristic,
    ledgerEqEulerCharacteristic: true,
    loadBearingIffPositiveLandauer: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Thermodynamics.Temperature.loadBearing_iff_positive_landauer",
      "Obsmetrologia.Thermodynamics.Temperature.landauerLedger_eq_eulerChar",
      "Obsmetrologia.Thermodynamics.Temperature.LandauerSupport.cost_pos",
    ]),
  });
}

export function freeEnergyFiring(
  lyapunov = freeEnergyLyapunov(
    closureToStableOperator,
    valuation(["top"], { top: "absurd" }),
  ),
  time,
  cell,
) {
  const chosenTime = time ?? lyapunov.energies.findIndex((energy, index) => {
    const next = lyapunov.energies[index + 1];
    return next !== undefined && energy > next;
  });
  if (chosenTime < 0) throw new TypeError("freeEnergyFiring: Lyapunov witness has no positive discharge step");
  const nextEnergy = lyapunov.energies[chosenTime + 1];
  if (nextEnergy === undefined) throw new TypeError("freeEnergyFiring: time has no successor energy");
  const discharge = lyapunov.energies[chosenTime] - nextEnergy;
  if (discharge <= 0) throw new TypeError("freeEnergyFiring: discharge is not positive");
  return Object.freeze({
    kind: "thermodynamics.temperature.freeEnergyFiring",
    lyapunov,
    time: chosenTime,
    cell: cell ?? lyapunov.cells[0] ?? "cell",
    discharge,
    dischargePositive: true,
    leanTheorem: "Obsmetrologia.Thermodynamics.Temperature.FreeEnergyFiring.discharge_pos",
  });
}

export function liftedThermoTransition(spec

) {
  const creationCount = topCreationCount(spec.creation);
  if (creationCount <= 0 || !spec.stochastic.flux.balanced || spec.support.cost <= 0 || spec.firing.discharge <= 0) {
    throw new TypeError("liftedThermoTransition: finite churn package is not positive and balanced");
  }
  return Object.freeze({
    kind: "thermodynamics.temperature.liftedTransition",
    creation: spec.creation,
    stochastic: spec.stochastic,
    support: spec.support,
    firing: spec.firing,
    creationCount,
    flux: spec.stochastic.flux,
    temperature: spec.stochastic.temperature,
    landauerCost: spec.support.cost,
    discharge: spec.firing.discharge,
    fluxBalanced: true,
    temperatureEqDistribution: true,
    producesLandauerAndDischarge: true,
    producesCreationLandauerAndDischarge: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Thermodynamics.Temperature.LiftedThermoTransition.creationCount_pos",
      "Obsmetrologia.Thermodynamics.Temperature.LiftedThermoTransition.flux_balanced",
      "Obsmetrologia.Thermodynamics.Temperature.LiftedThermoTransition.temperature_eq_distribution",
      "Obsmetrologia.Thermodynamics.Temperature.LiftedThermoTransition.produces_landauer_and_discharge",
      "Obsmetrologia.Thermodynamics.Temperature.LiftedThermoTransition.produces_creation_landauer_and_discharge",
    ]),
  });
}

export function temperatureModuleReceipt(spec

) {
  const gaugeCreation = gaugeTopCreationCount(spec.charge ?? "stable");
  const stationary = stationaryTopState(spec.kernel, spec.semiring, spec.distribution, spec.state);
  const detailedBalanced = detailedBalancedTopState(spec.kernel, spec.semiring, spec.distribution, spec.state);
  const support = spec.support ?? landauerSupport();
  const firing = spec.firing ?? freeEnergyFiring();
  const transition = liftedThermoTransition({ creation: gaugeCreation, stochastic: stationary, support, firing });
  return Object.freeze({
    kind: "thermodynamics.temperature.receipt:witness",
    gaugeCreation,
    stationary,
    detailedBalanced,
    support,
    firing,
    transition,
    capturedLeanModule: "Obsmetrologia.Thermodynamics.Temperature",
    boundary: "finite witness-retaining surface; real-valued physical scaling remains outside this Node surface",
  });
}
