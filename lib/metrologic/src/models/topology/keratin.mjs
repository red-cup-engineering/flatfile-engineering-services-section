/**
 * analysis/keratin - finite event-lattice lock histories.
 *
 * This carries the computable powerset-event face of
 * `Obsmetrologia.Relational.Material.Contact.Keratin`: irreversible add-event
 * locks, finite histories, lock-stream prefixes, and finite approximations to
 * the lock-stream limit.
 */

const freezeUnique = (events) =>
  Object.freeze([...new Set(events)]);

const below = (left, right) =>
  left.every((event) => right.includes(event));

export function addEvent(state, event) {
  return freezeUnique([...state, event]);
}

export function addEventWitness(state, event) {
  const before = freezeUnique(state);
  const after = addEvent(before, event);
  if (!after.includes(event) || !below(before, after)) throw new TypeError("addEventWitness: event lock did not fire inflationarily");
  return Object.freeze({
    kind: "keratin.addEvent:witness",
    event,
    before,
    after,
    fires: true,
    inflationary: true,
  });
}

export function runHistory(seed, history) {
  return history.reduce((state, event) => addEvent(state, event), freezeUnique(seed));
}

export function runHistoryWitness(
  seed,
  history,
  largerSeed = seed,
) {
  const admittedSeed = freezeUnique(seed);
  const result = runHistory(admittedSeed, history);
  const largerResult = runHistory(freezeUnique(largerSeed), history);
  if (!below(admittedSeed, result) || (below(admittedSeed, freezeUnique(largerSeed)) && !below(result, largerResult))) {
    throw new TypeError("runHistoryWitness: history failed inflationary or monotone check");
  }
  return Object.freeze({
    kind: "keratin.runHistory:witness",
    seed: admittedSeed,
    history: Object.freeze([...history]),
    result,
    inflationary: true,
    monotone: true,
  });
}

export function runLockPrefix(
  stream,
  prefixLength,
  seed,
) {
  if (!Number.isSafeInteger(prefixLength) || prefixLength < 0) {
    throw new RangeError("runLockPrefix: prefixLength must be a non-negative safe integer");
  }
  let state = freezeUnique(seed);
  for (let stage = 0; stage < prefixLength; stage += 1) {
    const event = typeof stream === "function" ? stream(stage) : stream[stage];
    if (event === undefined) throw new RangeError("runLockPrefix: finite stream ended before prefixLength");
    state = addEvent(state, event);
  }
  return state;
}

export function lockPrefixWitness(
  stream,
  prefixLength,
  seed,
) {
  const admittedSeed = freezeUnique(seed);
  const result = runLockPrefix(stream, prefixLength, admittedSeed);
  if (!below(admittedSeed, result)) throw new TypeError("lockPrefixWitness: prefix was not inflationary");
  return Object.freeze({
    kind: "keratin.lockPrefix:witness",
    seed: admittedSeed,
    prefixLength,
    result,
    inflationary: true,
  });
}

export function lockStreamDirectedWitness(
  stream,
  seed,
  leftPrefix,
  rightPrefix,
) {
  const upperPrefix = Math.max(leftPrefix, rightPrefix);
  const left = runLockPrefix(stream, leftPrefix, seed);
  const right = runLockPrefix(stream, rightPrefix, seed);
  const upperState = runLockPrefix(stream, upperPrefix, seed);
  if (!below(left, upperState) || !below(right, upperState)) {
    throw new TypeError("lockStreamDirectedWitness: upper prefix did not dominate both prefixes");
  }
  return Object.freeze({
    kind: "keratin.lockPrefix.directed:witness",
    leftPrefix,
    rightPrefix,
    upperPrefix,
    leftBelowUpper: true,
    rightBelowUpper: true,
    upperState,
  });
}

export function lockStreamLimitWitness(
  stream,
  seed,
  prefixLength,
) {
  const finitePrefix = lockPrefixWitness(stream, prefixLength, seed);
  const limit = runLockPrefix(stream, stream.length, seed);
  if (!below(finitePrefix.result, limit)) throw new TypeError("lockStreamLimitWitness: prefix did not lie below finite stream limit");
  return Object.freeze({
    kind: "keratin.lockStreamLimit:witness",
    seed: freezeUnique(seed),
    finitePrefix,
    limit,
    prefixBelowLimit: true,
  });
}

export function keratinReceipt() {
  const stream = Object.freeze(["feltLock", "pill", "damage", "fracture"]);
  const add = addEventWitness(Object.freeze([]), "feltLock");
  const history = runHistoryWitness(Object.freeze(["feltLock"]), ["pill", "damage"], ["feltLock", "fracture"]);
  const prefix = lockPrefixWitness(stream, 2, Object.freeze([]));
  const directed = lockStreamDirectedWitness(stream, Object.freeze([]), 1, 3);
  const limit = lockStreamLimitWitness(stream, Object.freeze([]), 3);
  return Object.freeze({
    kind: "keratin.receipt:witness",
    capturedLeanModule: "Obsmetrologia.Relational.Material.Contact.Keratin",
    addEvent: add,
    history,
    prefix,
    directed,
    limit,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Material.lock_infl",
      "Obsmetrologia.Relational.Material.runHistory_infl",
      "Obsmetrologia.Relational.Material.runHistory_mono",
      "Obsmetrologia.Relational.Material.runLockPrefix_infl",
      "Obsmetrologia.Relational.Material.runLockPrefix_mono",
      "Obsmetrologia.Relational.Material.runLockPrefix_le_succ",
      "Obsmetrologia.Relational.Material.runLockPrefix_le_of_le",
      "Obsmetrologia.Relational.Material.runLockPrefix_directed",
      "Obsmetrologia.Relational.Material.runLockPrefix_le_limit",
      "Obsmetrologia.Relational.Material.seed_le_lockSeed",
      "Obsmetrologia.Relational.Material.settle_lock_is_least_compatible",
      "Obsmetrologia.Relational.Material.lockStreamPrefixSeed_le_limitSeed",
      "Obsmetrologia.Relational.Material.settle_lockStreamLimit_is_least_compatible",
      "Obsmetrologia.Relational.Material.addEvent_fires",
      "Obsmetrologia.Relational.Material.addEvent_infl",
    ]),
  });
}

export function shroudIndexedKeratinReceipt() {
  const vertices = Object.freeze(["shaft-root", "shaft-tip"]);
  const shroudPoints = Object.freeze(["event-horizon-root", "event-horizon-tip"]);
  const interiorPoints = Object.freeze(["event-horizon-root", "event-horizon-tip", "interior-shadow"]);
  const address = Object.freeze({
    "shaft-root": "event-horizon-root",
    "shaft-tip": "event-horizon-tip",
  });
  const history = Object.freeze({
    "shaft-root": Object.freeze(["feltLock", "pill"]),
    "shaft-tip": Object.freeze(["damage"]),
  });
  const seed = Object.freeze({
    "shaft-root": Object.freeze(["feltLock"]),
    "shaft-tip": Object.freeze([]),
  });
  const lockedSeed = Object.freeze(Object.fromEntries(vertices.map((vertex) => [
    vertex,
    runHistory(seed[vertex] ?? [], history[vertex] ?? []),
  ])));
  const shroudEventOnShroud = vertices.every((vertex) => shroudPoints.includes(address[vertex] ?? ""));
  const shroudEventInHole = vertices.every((vertex) => interiorPoints.includes(address[vertex] ?? ""));
  const lockedSeedInflationary = vertices.every((vertex) => below(seed[vertex] ?? [], lockedSeed[vertex] ?? []));
  if (!shroudEventOnShroud || !shroudEventInHole || !lockedSeedInflationary) {
    throw new TypeError("shroudIndexedKeratinReceipt: indexed shroud lock laws failed");
  }
  return Object.freeze({
    kind: "keratin.shroudIndexed.receipt:witness",
    capturedLeanModule: "Obsmetrologia.Relational.Material.Contact.ShroudIndexedKeratin",
    vertices,
    shroudPoints,
    interiorPoints,
    address,
    history,
    seed,
    lockedSeed,
    shroudEventOnShroud: true,
    shroudEventInHole: true,
    lockedSeedInflationary: true,
    settleLockedLeastCompatible: true,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Material.ShroudIndexedKeratin.shroudEvent_on_shroud",
      "Obsmetrologia.Relational.Material.ShroudIndexedKeratin.shroudEvent_in_hole",
      "Obsmetrologia.Relational.Material.ShroudIndexedKeratin.lockedSeed_infl",
      "Obsmetrologia.Relational.Material.ShroudIndexedKeratin.settle_locked_least_compatible",
    ]),
  });
}
