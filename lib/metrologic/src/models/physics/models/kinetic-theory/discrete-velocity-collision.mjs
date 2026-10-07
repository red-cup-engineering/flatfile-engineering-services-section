/**
 * models/kinetic-theory/discrete-velocity-collision - finite kinetic collision invariants.
 *
 * This captures `Obsmetrologia.Relational.Kinetic.DiscreteVelocityCollision`:
 * binary collisions over a finite velocity alphabet, populations as multisets,
 * weighted totals, one-step conservation, physical momentum/energy invariants,
 * and conservation along a collision evolution.
 */

const assertInt = (value, caller) => {
  if (!Number.isSafeInteger(value)) throw new RangeError(`${caller}: expected a safe integer`);
  return value;
};

const normalizeVelocity = (velocity, caller) => {
  const trimmed = velocity.trim();
  if (trimmed.length === 0) throw new TypeError(`${caller}: velocity labels must be nonempty`);
  return trimmed;
};

function normalizePopulation(
  population,
  caller,
) {
  return Object.freeze(population.map((velocity) => normalizeVelocity(velocity, caller)));
}

function normalizeWeight(
  velocities,
  weight,
  caller,
) {
  const alphabet = Object.freeze([
    ...new Set([
      ...velocities,
      ...(Object.keys(weight)),
    ]),
  ]);
  return Object.freeze(Object.fromEntries(alphabet.map((velocity) => {
    if (!Object.hasOwn(weight, velocity)) throw new TypeError(`${caller}: missing weight for ${velocity}`);
    return [velocity, assertInt(weight[velocity], caller)];
  })));
}

function counts(population) {
  const result = new Map();
  for (const velocity of population) result.set(velocity, (result.get(velocity) ?? 0) + 1);
  return result;
}

function sameCounts(left, right) {
  const leftCounts = counts(left);
  const rightCounts = counts(right);
  if (leftCounts.size !== rightCounts.size) return false;
  for (const [velocity, count] of leftCounts) {
    if (rightCounts.get(velocity) !== count) return false;
  }
  return true;
}

function removeOne(population, velocity) {
  const index = population.indexOf(velocity);
  if (index < 0) return false;
  population.splice(index, 1);
  return true;
}

export function collision(
  inL,
  inR,
  outL,
  outR,
) {
  return Object.freeze({
    kind: "relational.kinetic.collision",
    inL: normalizeVelocity(inL, "collision"),
    inR: normalizeVelocity(inR, "collision"),
    outL: normalizeVelocity(outL, "collision"),
    outR: normalizeVelocity(outR, "collision"),
  });
}

export function populationTotal(
  weight,
  population,
) {
  return assertInt(
    normalizePopulation(population, "populationTotal").reduce((sum, velocity) => {
      if (!Object.hasOwn(weight, velocity)) throw new TypeError(`populationTotal: missing weight for ${velocity}`);
      return sum + assertInt(weight[velocity], "populationTotal");
    }, 0),
    "populationTotal",
  );
}

export function collisionConserves(
  c,
  weight,
) {
  const normalizedWeight = normalizeWeight([c.inL, c.inR, c.outL, c.outR], weight, "collisionConserves");
  const inputTotal = normalizedWeight[c.inL] + normalizedWeight[c.inR];
  const outputTotal = normalizedWeight[c.outL] + normalizedWeight[c.outR];
  if (inputTotal !== outputTotal) return undefined;
  return Object.freeze({
    kind: "relational.kinetic.collision.conserves:witness",
    collision: c,
    weight: normalizedWeight,
    inputTotal,
    outputTotal,
    conserves: true,
    leanDefinition: "Obsmetrologia.Relational.Kinetic.Collision.Conserves",
  });
}

export function totalPerm(
  weight,
  left,
  right,
) {
  const admittedLeft = normalizePopulation(left, "totalPerm");
  const admittedRight = normalizePopulation(right, "totalPerm");
  if (!sameCounts(admittedLeft, admittedRight)) throw new TypeError("totalPerm: populations are not permutations");
  const leftTotal = populationTotal(weight, admittedLeft);
  const rightTotal = populationTotal(weight, admittedRight);
  if (leftTotal !== rightTotal) throw new TypeError("totalPerm: permuted totals differ");
  return Object.freeze({
    kind: "relational.kinetic.total_perm:witness",
    weight,
    left: admittedLeft,
    right: admittedRight,
    total: leftTotal,
    permutationInvariant: true,
    leanTheorem: "Obsmetrologia.Relational.Kinetic.total_perm",
  });
}

export function collisionStep(
  c,
  before,
  after,
) {
  const admittedBefore = normalizePopulation(before, "collisionStep");
  const admittedAfter = normalizePopulation(after, "collisionStep");
  const restBefore = [...admittedBefore];
  if (!removeOne(restBefore, c.inL) || !removeOne(restBefore, c.inR)) {
    throw new TypeError("collisionStep: input particles are not present in the before population");
  }
  const restAfter = [...admittedAfter];
  if (!removeOne(restAfter, c.outL) || !removeOne(restAfter, c.outR)) {
    throw new TypeError("collisionStep: output particles are not present in the after population");
  }
  if (!sameCounts(restBefore, restAfter)) throw new TypeError("collisionStep: remaining population changed");
  return Object.freeze({
    kind: "relational.kinetic.step:witness",
    collision: c,
    before: admittedBefore,
    after: admittedAfter,
    rest: Object.freeze(restBefore),
    firesUpToPermutation: true,
    leanDefinition: "Obsmetrologia.Relational.Kinetic.Step",
  });
}

export function stepConserves(
  invariant,
  step,
) {
  if (step.collision !== invariant.collision) throw new TypeError("stepConserves: invariant is for a different collision");
  const beforeTotal = populationTotal(invariant.weight, step.before);
  const afterTotal = populationTotal(invariant.weight, step.after);
  if (beforeTotal !== afterTotal) throw new TypeError("stepConserves: weighted total is not conserved");
  return Object.freeze({
    kind: "relational.kinetic.step_conserves:witness",
    step,
    invariant,
    beforeTotal,
    afterTotal,
    conserved: true,
    leanTheorem: "Obsmetrologia.Relational.Kinetic.step_conserves",
  });
}

export function physicalCollision(
  velocity,
  c,
) {
  const states = Object.freeze([...new Set([c.inL, c.inR, c.outL, c.outR, ...(Object.keys(velocity))])]);
  const admittedVelocity = normalizeWeight(states, velocity, "physicalCollision");
  const energy = Object.freeze(Object.fromEntries(states.map((state) => [
    state,
    admittedVelocity[state] * admittedVelocity[state],
  ])));
  const momentumWitness = collisionConserves(c, admittedVelocity);
  const energyWitness = collisionConserves(c, energy);
  if (momentumWitness === undefined || energyWitness === undefined) {
    throw new TypeError("physicalCollision: collision does not conserve momentum and kinetic energy");
  }
  return Object.freeze({
    kind: "relational.kinetic.physical:witness",
    collision: c,
    velocity: admittedVelocity,
    momentum: momentumWitness,
    energy: energyWitness,
    leanStructure: "Obsmetrologia.Relational.Kinetic.Physical",
  });
}

export function physicalConserves(
  physical,
  step,
) {
  const unit = Object.freeze(Object.fromEntries(step.before.map((state) => [state, 1])));
  const numberInvariant = collisionConserves(step.collision, unit);
  if (numberInvariant === undefined) throw new TypeError("physicalConserves: unit weight did not conserve number");
  return Object.freeze({
    kind: "relational.kinetic.physicalConservation:witness",
    number: stepConserves(numberInvariant, step),
    momentum: stepConserves(physical.momentum, step),
    energy: stepConserves(physical.energy, step),
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Kinetic.physical_conserves_number",
      "Obsmetrologia.Relational.Kinetic.physical_conserves_momentum",
      "Obsmetrologia.Relational.Kinetic.physical_conserves_energy",
    ]),
  });
}

export function evolutionConserves(
  collisions,
  weight,
  initial,
  steps,
) {
  let current = normalizePopulation(initial, "evolutionConserves");
  const stepWitnesses = [];
  for (const item of steps) {
    if (!sameCounts(current, normalizePopulation(item.before, "evolutionConserves"))) {
      throw new TypeError("evolutionConserves: step does not start at the current population");
    }
    if (!collisions.includes(item.collision)) throw new TypeError("evolutionConserves: collision is not in the system");
    const invariant = collisionConserves(item.collision, weight);
    if (invariant === undefined) throw new TypeError("evolutionConserves: collision does not conserve the shared weight");
    const step = collisionStep(item.collision, item.before, item.after);
    stepWitnesses.push(stepConserves(invariant, step));
    current = step.after;
  }
  const initialTotal = populationTotal(weight, initial);
  const finalTotal = populationTotal(weight, current);
  if (initialTotal !== finalTotal) throw new TypeError("evolutionConserves: evolution did not conserve the shared weight");
  return Object.freeze({
    kind: "relational.kinetic.evolution_conserves:witness",
    collisions: Object.freeze([...collisions]),
    steps: Object.freeze(stepWitnesses),
    initial: normalizePopulation(initial, "evolutionConserves"),
    final: current,
    initialTotal,
    finalTotal,
    conserved: true,
    leanTheorem: "Obsmetrologia.Relational.Kinetic.evolution_conserves",
  });
}

export function discreteVelocityCollisionReceipt() {
  const velocities = Object.freeze({ neg: -1, pos: 1, spectator: 0 });
  const c = collision("neg", "pos", "pos", "neg");
  const before = Object.freeze(["spectator", "pos", "neg"]);
  const after = Object.freeze(["neg", "spectator", "pos"]);
  const step = collisionStep(c, before, after);
  const momentumInvariant = collisionConserves(c, velocities);
  if (momentumInvariant === undefined) throw new TypeError("discreteVelocityCollisionReceipt: momentum invariant failed");
  const totalPermWitness = totalPerm(velocities, before, after);
  const stepConservation = stepConserves(momentumInvariant, step);
  const physical = physicalCollision(velocities, c);
  const physicalConservation = physicalConserves(physical, step);
  const evolution = evolutionConserves([c], velocities, before, [
    Object.freeze({ collision: c, before, after }),
    Object.freeze({ collision: c, before: after, after: before }),
  ]);
  return Object.freeze({
    kind: "relational.kinetic.discreteVelocityCollision.receipt:witness",
    totalPerm: totalPermWitness,
    stepConserves: stepConservation,
    physical,
    physicalConservation,
    evolution,
    capturedLeanModule: "Obsmetrologia.Relational.Kinetic.DiscreteVelocityCollision",
  });
}
