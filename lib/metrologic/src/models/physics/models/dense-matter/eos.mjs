/**
 * models/dense-matter/eos - finite EOS admissibility.
 *
 * This captures `Obsmetrologia.Relational.DenseMatter.EOS`: sampled pressure
 * and energy, stability, causality, admissibility, incompressible limit,
 * causal speed bounds, and stiff/superluminal witnesses.
 */

function checkSamples(samples) {
  if (samples.length === 0) throw new TypeError("finiteEOS: expected samples");
  return Object.freeze(samples.map((sample) => {
    if (!Number.isSafeInteger(sample) || sample < 0) throw new TypeError("finiteEOS: samples must be natural numbers");
    return sample;
  }));
}

export function finiteEOS(samples, pressure, energy) {
  return Object.freeze({
    kind: "relational.denseMatter.eos.finite",
    samples: checkSamples(samples),
    pressure,
    energy,
  });
}

export function stableEOS(eos) {
  return eos.samples.every((a) => eos.samples.every((b) => a > b || eos.pressure(a) <= eos.pressure(b)));
}

export function causalEOS(eos, c2) {
  return eos.samples.every((a) => eos.samples.every((b) =>
    a > b || eos.pressure(b) - eos.pressure(a) <= c2 * (eos.energy(b) - eos.energy(a))));
}

export function admissibleEOS(eos, c2) {
  if (!stableEOS(eos) || !causalEOS(eos, c2)) throw new TypeError("admissibleEOS: EOS is not stable and causal");
  return Object.freeze({
    kind: "relational.denseMatter.eos.admissible:witness",
    eos,
    c2,
    stable: true,
    causal: true,
    leanDefinitions: Object.freeze([
      "Obsmetrologia.Relational.DenseMatter.StableEOS",
      "Obsmetrologia.Relational.DenseMatter.CausalEOS",
      "Obsmetrologia.Relational.DenseMatter.Admissible",
    ]),
  });
}

export function admissibleSpeedBound(eos, c2, a, b) {
  admissibleEOS(eos, c2);
  const pressureBound = eos.pressure(a) + c2 * (eos.energy(b) - eos.energy(a));
  if (eos.pressure(b) > pressureBound) throw new TypeError("admissibleSpeedBound: pressure outran bound");
  return Object.freeze({
    kind: "relational.denseMatter.eos.speed_bound:witness",
    eos,
    c2,
    a,
    b,
    pressureBound,
    withinBound: true,
    leanTheorem: "Obsmetrologia.Relational.DenseMatter.admissible_speed_bound",
  });
}

export function stiffEOS() {
  return finiteEOS([0, 1, 2, 3], (n) => n, (n) => n);
}

export function superluminalEOS() {
  return finiteEOS([0, 1, 2, 3], (n) => 2 * n, (n) => n);
}

export function incompressibleOfCausalZero(eos) {
  if (!stableEOS(eos) || !causalEOS(eos, 0)) return false;
  return eos.samples.every((a) => eos.samples.every((b) => a > b || eos.pressure(a) === eos.pressure(b)));
}

export function maxEOS(left, right) {
  return finiteEOS(left.samples, (n) => Math.max(left.pressure(n), right.pressure(n)), left.energy);
}

export function denseMatterEOSReceipt() {
  const stiff = stiffEOS();
  const flat = finiteEOS([0, 1, 2], () => 4, (n) => n);
  return Object.freeze({
    kind: "relational.denseMatter.eos.receipt:witness",
    stiff: admissibleEOS(stiff, 1),
    speedBound: admissibleSpeedBound(stiff, 1, 0, 3),
    incompressibleUniform: incompressibleOfCausalZero(flat),
    superluminalRejected: !causalEOS(superluminalEOS(), 1),
    maxStable: stableEOS(maxEOS(stiff, flat)),
    capturedLeanModule: "Obsmetrologia.Relational.DenseMatter.EOS",
  });
}
