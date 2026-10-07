/**
 * models/quantum-condensate/fock-condensate - finite Fock condensate realizations.
 *
 * This captures `Obsmetrologia.Relational.Quantum.FockCondensate` as the finite
 * structure it currently proves: C4 ledger counts, particle-number Fock sectors,
 * coherent condensates with indefinite support, condensate holes, and finite
 * glass-overlap nonfactorization.
 */
import {
  fockSectorTotal,
  fockSectorTotalToFockSpace,

} from "./filter-fiber-sector.mjs";

const stepTraits = Object.freeze({
  matterCreate: Object.freeze({
    isCreation: true,
    isAnnihilation: false,
    isMatter: true,
    isAntimatter: false,
  }),
  antimatterCreate: Object.freeze({
    isCreation: true,
    isAnnihilation: false,
    isMatter: false,
    isAntimatter: true,
  }),
  matterAnnihilate: Object.freeze({
    isCreation: false,
    isAnnihilation: true,
    isMatter: true,
    isAntimatter: false,
  }),
  antimatterAnnihilate: Object.freeze({
    isCreation: false,
    isAnnihilation: true,
    isMatter: false,
    isAntimatter: true,
  }),
});

const assertSafeNat = (value, caller) => {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${caller}: expected a safe natural number`);
  return value;
};

function stepName(step) {
  return typeof step === "string" ? step : step.name;
}

function hasOwnValue(
  configuration,
  coordinate,
) {
  return Object.hasOwn(configuration, coordinate);
}

function normalizeFockSpace(space, caller) {
  if (space.particleNumber !== space.modes.length) {
    throw new TypeError(`${caller}: Fock sector particle number does not match mode slots`);
  }
  return Object.freeze({
    kind: "relational.fock.space",
    particleNumber: assertSafeNat(space.particleNumber, caller),
    modes: Object.freeze([...space.modes]),
  });
}

export function c4LedgerStep(name) {
  const traits = stepTraits[name];
  return Object.freeze({
    kind: "relational.quantum.c4Ledger.step",
    name,
    ...traits,
  });
}

export function c4Ledger(steps) {
  const normalizedSteps = Object.freeze(steps.map((step) => c4LedgerStep(stepName(step))));
  const creationCount = normalizedSteps.filter((step) => step.isCreation).length;
  const annihilationCount = normalizedSteps.filter((step) => step.isAnnihilation).length;
  return Object.freeze({
    kind: "relational.quantum.c4Ledger",
    steps: normalizedSteps,
    creationCount,
    annihilationCount,
    particleNumber: Math.max(0, creationCount - annihilationCount),
  });
}

export function c4LedgerParticleNumberLaws() {
  const nil = c4Ledger([]);
  const singleCreate = c4Ledger(["matterCreate"]);
  const singleAnnihilate = c4Ledger(["antimatterAnnihilate"]);
  if (nil.particleNumber !== 0 || singleCreate.particleNumber !== 1 || singleAnnihilate.particleNumber !== 0) {
    throw new TypeError("c4LedgerParticleNumberLaws: finite C4 ledger laws failed");
  }
  return Object.freeze({
    kind: "relational.quantum.c4Ledger.particleNumberLaws:witness",
    nilParticleNumber: 0,
    singleCreateParticleNumber: 1,
    singleAnnihilateParticleNumber: 0,
    nilLaw: true,
    singleCreateLaw: true,
    singleAnnihilateLaw: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Quantum.C4Ledger.particleNumber_nil",
      "Obsmetrologia.Relational.Quantum.C4Ledger.particleNumber_single_create",
      "Obsmetrologia.Relational.Quantum.C4Ledger.particleNumber_single_annihilate",
    ]),
  });
}

export function c4LedgerFockSector(
  ledger,
  modes,
) {
  if (modes.length !== ledger.particleNumber) {
    throw new TypeError("c4LedgerFockSector: mode slots must match the ledger particle number");
  }
  const sector = fockSectorTotal(modes);
  const fockSpace = fockSectorTotalToFockSpace(sector);
  if (fockSpace.particleNumber !== ledger.particleNumber) {
    throw new TypeError("c4LedgerFockSector: generated sector does not match ledger particle number");
  }
  return Object.freeze({
    kind: "relational.quantum.c4Ledger.fockSector_particleNumber:witness",
    ledger,
    sector,
    fockSpace,
    particleNumberMatchesLedger: true,
    leanTheorem: "Obsmetrologia.Relational.Quantum.C4Ledger.fockSector_particleNumber",
  });
}

export function fockState(support) {
  return Object.freeze({
    kind: "relational.quantum.fockState",
    support: Object.freeze(support.map((space) => normalizeFockSpace(space, "fockState"))),
  });
}

export function indefiniteParticleNumber(
  state,
) {
  for (const left of state.support) {
    for (const right of state.support) {
      if (left.particleNumber !== right.particleNumber) {
        return Object.freeze({
          kind: "relational.quantum.indefiniteParticleNumber:witness",
          left,
          right,
          distinctParticleNumbers: true,
          leanDefinition: "Obsmetrologia.Relational.Quantum.IndefiniteParticleNumber",
        });
      }
    }
  }
  return undefined;
}

export function coherentCondensate(
  support,
  orderParameter,
) {
  const indefinite = indefiniteParticleNumber(support);
  if (indefinite === undefined) {
    throw new TypeError("coherentCondensate: support must contain distinct particle-number sectors");
  }
  return Object.freeze({
    kind: "relational.quantum.coherentCondensate",
    support,
    orderParameter,
    indefinite,
    orderParameterCount: 1,
    hasIndefiniteParticleNumber: true,
    oneOrderParameter: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Quantum.CoherentCondensate.has_indefinite_particle_number",
      "Obsmetrologia.Relational.Quantum.CoherentCondensate.orderParameterCount_eq_one",
    ]),
  });
}

export function noReadoutHole(
  events,
  boundary,
) {
  return Object.freeze({
    kind: "relational.quantum.condensateHole.noReadoutHole",
    events: Object.freeze([...events]),
    boundary: Object.freeze([...boundary]),
    noReadoutInterior: true,
    theoremReference: "Obsmetrologia.Relational.Spacetime.Boundary.Hole",
  });
}

export function condensateHole(
  hole,
  condensate,
) {
  return Object.freeze({
    kind: "relational.quantum.condensateHole",
    hole,
    condensate,
    indefiniteParticleNumber: true,
    oneOrderParameter: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Quantum.CondensateHole.indefinite_particle_number",
      "Obsmetrologia.Relational.Quantum.CondensateHole.one_order_parameter",
    ]),
  });
}

export function nonfactorizingJoint(
  label,
  support,
) {
  if (label.trim().length === 0) throw new TypeError("nonfactorizingJoint: label must be nonempty");
  return Object.freeze({
    kind: "relational.quantum.glassOverlap.joint",
    label: label.trim(),
    support: Object.freeze([...support]),
    factorizes: false,
  });
}

export function glassOverlapCount(
  support,
  left,
  right,
) {
  return support.filter((coordinate) => {
    if (!hasOwnValue(left, coordinate) || !hasOwnValue(right, coordinate)) {
      throw new TypeError(`glassOverlapCount: missing value at coordinate ${coordinate}`);
    }
    return Object.is(left[coordinate], right[coordinate]);
  }).length;
}

export function glassOverlapEntanglement(
  support,
  left,
  right,
  joint,
) {
  const admittedSupport = Object.freeze([...support]);
  if (joint.factorizes !== false) throw new TypeError("glassOverlapEntanglement: joint must fail to factor");
  const overlapCount = glassOverlapCount(admittedSupport, left, right);
  return Object.freeze({
    kind: "relational.quantum.glassOverlapEntanglement",
    support: admittedSupport,
    left: Object.freeze({ ...left }),
    right: Object.freeze({ ...right }),
    joint,
    orderParameter: overlapCount,
    overlapCount,
    notFactorizes: true,
    factorizedGluingExcluded: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Quantum.GlassOverlapEntanglement.orderParameter_eq_overlapCount",
      "Obsmetrologia.Relational.Quantum.GlassOverlapEntanglement.joint_fails_to_factor",
      "Obsmetrologia.Relational.Quantum.GlassOverlapEntanglement.not_factorized_gluing",
    ]),
  });
}

export function eprGlassOverlapEntanglement() {
  const support = Object.freeze(["0", "1"]);
  return glassOverlapEntanglement(
    support,
    Object.freeze({ 0: true, 1: false }),
    Object.freeze({ 0: true, 1: false }),
    nonfactorizingJoint("Obsmetrologia.Relational.Kinetic.eprJoint", support),
  );
}

export function fockCondensateReceipt() {
  const ledgerLaws = c4LedgerParticleNumberLaws();
  const ledgerSector = c4LedgerFockSector(c4Ledger(["matterCreate", "antimatterCreate", "matterAnnihilate"]), [
    "mode-created",
  ]);
  const vacuum = fockSectorTotalToFockSpace(fockSectorTotal([]));
  const oneParticle = fockSectorTotalToFockSpace(fockSectorTotal(["mode-created"]));
  const condensate = coherentCondensate(
    fockState([vacuum, oneParticle]),
    "retained-glass-overlap",
  );
  const condensateHoleWitness = condensateHole(
    noReadoutHole(["event-hidden"], ["event-boundary"]),
    condensate,
  );
  const glassOverlap = eprGlassOverlapEntanglement();
  if (glassOverlap.orderParameter !== 2 || !glassOverlap.notFactorizes) {
    throw new TypeError("fockCondensateReceipt: EPR glass-overlap witness failed");
  }
  return Object.freeze({
    kind: "relational.quantum.fockCondensate.receipt:witness",
    ledgerLaws,
    ledgerSector,
    condensate,
    condensateHole: condensateHoleWitness,
    glassOverlap,
    eprOrderParameter: 2,
    eprNotFactorizes: true,
    finiteFockSpaceOnly: true,
    capturedLeanModule: "Obsmetrologia.Relational.Quantum.FockCondensate",
  });
}
