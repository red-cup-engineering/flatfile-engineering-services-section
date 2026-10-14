/**
 * chu — Chu spaces over FOUR.
 *
 * A Chu space is a matrix r : points × states → FOUR, its entries readings in the
 * knowledge family (the data layer's four). Points and states are any values, told apart by a
 * sameness (by default: equal strings, else identical canonical bytes). Rows are a
 * point's costate, columns a state's extension; `transpose` swaps points and
 * states and `dual` also negates every entry (the linear-logic dual (–)^⊥). A Chu
 * map between two spaces is an adjoint pair — forward on points, backward on
 * states — with r_target(f a, x) = r_source(a, g x) on every cell (Chu 1979; Pratt
 * 1995). FOUR itself is *-autonomous under its fusion and residuum, and
 * `chuLawReceipt` checks every law exhaustively over small carriers.
 */
import { semanticBytes } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { canonicalJson as canonical } from "@red-cup-engineering/json-services-section/canonical-json";
import { readingAs, readingFamilies, readingSchema, samePoint as sameReading, sidesOfReading, fusionReading, knowledgeJoinReading, negateReading, residuumReading, truthLeqReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";

const defaultSame = (left, right) => left === right || (typeof left === "object" && left !== null && typeof right === "object" && right !== null && semanticBytes(left).equals(semanticBytes(right)));
const admitReading = (reading) => readingAs("knowledge", reading);

/** The JSON Schema of a Chu space whose points and states are names. */
export const chuSpaceSchema = Object.freeze({
  type: "object",
  required: ["kind", "points", "states", "absent", "matrix"],
  properties: {
    kind: { const: "chu.space" },
    points: { type: "array" },
    states: { type: "array" },
    absent: readingSchema("knowledge"),
    matrix: { type: "array", items: { type: "array", items: readingSchema("knowledge") } },
  },
  description: "A Chu space over FOUR: points (rows), states (columns), the reading a read outside the matrix returns, and the dense matrix r : points × states → FOUR.",
});

const distinct = (carrier, same, label) => {
  const out = [];
  for (const value of carrier) {
    if (value === undefined || value === "") throw new TypeError(`chu: ${label} must be defined and non-empty`);
    if (out.some((existing) => same(existing, value))) throw new TypeError(`chu: ${label} must not repeat ${JSON.stringify(value)}`);
    out.push(value);
  }
  return Object.freeze(out);
};

/**
 * A Chu space from a reading function. Points and states keep their given order, so rows and columns
 * read deterministically. A cell whose `readingAt` returns null or undefined reads as `absent` (default
 * `absurd`, the open-world "nothing witnessed here").
 */
export function chuSpace(points, states, readingAt, options = {}) {
  const samePoint = options.samePoint ?? defaultSame, sameState = options.sameState ?? defaultSame;
  const P = distinct(points, samePoint, "points"), X = distinct(states, sameState, "states");
  const absent = admitReading(options.absent ?? "absurd");
  const matrix = Object.freeze(P.map((point) => Object.freeze(X.map((state) => {
    const reading = readingAt(point, state);
    return reading == null ? absent : admitReading(reading);
  }))));
  return Object.freeze({ kind: "chu.space", points: P, states: X, absent, matrix, samePoint, sameState });
}

/** A Chu space from an explicit `{ [point]: { [state]: reading } }` matrix of names. */
export const chuSpaceOfMatrix = (points, states, matrix, options = {}) =>
  chuSpace(points, states, (point, state) => (Object.hasOwn(matrix, point) && Object.hasOwn(matrix[point], state) ? matrix[point][state] : undefined), options);

/** A Chu space from `[point, state, reading]` entries; entries at one cell are joined in the knowledge order. */
export function chuSpaceOfEntries(points, states, entries, options = {}) {
  const samePoint = options.samePoint ?? defaultSame, sameState = options.sameState ?? defaultSame;
  const found = [];
  for (const [point, state, reading] of entries) {
    const at = found.find((entry) => samePoint(entry.point, point) && sameState(entry.state, state));
    if (at) at.reading = knowledgeJoinReading(at.reading, admitReading(reading));
    else found.push({ point, state, reading: admitReading(reading) });
  }
  return chuSpace(points, states, (point, state) => found.find((entry) => samePoint(entry.point, point) && sameState(entry.state, state))?.reading, options);
}

/** Whether a value is a Chu space built by this module. */
export const isChuSpace = (value) => !!value && typeof value === "object" && value.kind === "chu.space";

// — reads —

const pointIndex = (space, point) => space.points.findIndex((candidate) => space.samePoint(candidate, point));
const stateIndex = (space, state) => space.states.findIndex((candidate) => space.sameState(candidate, state));

/** `r a x` — the reading at one point/state pair; `absent` outside the matrix. */
export function at(space, point, state) {
  const a = pointIndex(space, point), x = stateIndex(space, state);
  return a < 0 || x < 0 ? space.absent : space.matrix[a][x];
}

/** A point's costate: its reading across every state (a row). */
export const row = (space, point) => Object.freeze(space.states.map((state) => Object.freeze({ state, reading: at(space, point, state) })));

/** A state's column: every point's reading on it. */
export const col = (space, state) => Object.freeze(space.points.map((point) => Object.freeze({ point, reading: at(space, point, state) })));

/** A state's positive FCA incidence: every point whose evidence-for slot is set.
 * BOTH positive-only (`potential`) and contradictory (`stable`) qualify.
 * This is Obsmetrologia.Valuation.posIncidence, not the truth-order
 * designated-only predicate. The negative slot remains independently told. */
export const extension = (space, state) => Object.freeze(col(space, state).filter((cell) => sidesOfReading(cell.reading)[0]).map((cell) => cell.point));

/** Fold a row to one reading through a join (default the knowledge join, identity absurd). */
export const settleRow = (space, point, join = knowledgeJoinReading, identity = "absurd") => row(space, point).reduce((accumulated, cell) => join(accumulated, cell.reading), identity);

/** Fold a column to one reading through a join (default the knowledge join, identity absurd). */
export const settleColumn = (space, state, join = knowledgeJoinReading, identity = "absurd") => col(space, state).reduce((accumulated, cell) => join(accumulated, cell.reading), identity);

/** A point's witnesses: its settled reading and the states whose entry tells it for, and against. */
export function pointWitnesses(space, point) {
  const line = row(space, point);
  const telling = (side) => line.filter((cell) => sidesOfReading(cell.reading)[side]).map((cell) => String(cell.state)).sort();
  return Object.freeze({ settled: settleRow(space, point), for: Object.freeze(telling(0)), against: Object.freeze(telling(1)) });
}

// — duality —

/** Transpose: swap points and states. `transpose ∘ transpose = id`. */
export const transpose = (space) => chuSpace(space.states, space.points, (state, point) => at(space, point, state), { absent: space.absent, samePoint: space.sameState, sameState: space.samePoint });

/** The linear-logic dual: transpose and negate every entry, `absent` too, so the round trip is exact. */
export const dual = (space) => chuSpace(space.states, space.points, (state, point) => negateReading(at(space, point, state)), { absent: negateReading(space.absent), samePoint: space.sameState, sameState: space.samePoint });

/** Whether two Chu spaces are the same structure. */
export function sameChuSpace(left, right) {
  if (left.points.length !== right.points.length || left.states.length !== right.states.length) return false;
  if (!left.points.every((point, index) => left.samePoint(point, right.points[index]))) return false;
  if (!left.states.every((state, index) => left.sameState(state, right.states[index]))) return false;
  if (!sameReading(left.absent, right.absent)) return false;
  return left.points.every((_, a) => left.states.every((_, x) => sameReading(left.matrix[a][x], right.matrix[a][x])));
}

// — Chu maps —

/** Check a candidate adjoint pair `source → target`: both legs stay in their carriers and adjointness
 *  holds as an identity of readings on every cell. */
export function checkChuMap(source, target, forward, backward) {
  const failures = [];
  for (const point of source.points) {
    const mapped = forward(point);
    if (pointIndex(target, mapped) < 0) failures.push(Object.freeze({ kind: "chu.Map.domain-failure", leg: "forward", from: point, mapped }));
  }
  for (const state of target.states) {
    const mapped = backward(state);
    if (stateIndex(source, mapped) < 0) failures.push(Object.freeze({ kind: "chu.Map.domain-failure", leg: "backward", from: state, mapped }));
  }
  if (failures.length === 0) {
    for (const point of source.points) for (const state of target.states) {
      const left = at(target, forward(point), state), right = at(source, point, backward(state));
      if (left !== right) failures.push(Object.freeze({ kind: "chu.Map.adjointness-failure", point, state, target: left, source: right }));
    }
  }
  return failures.length === 0
    ? Object.freeze({ kind: "chu.Map:witness", failures: Object.freeze([]) })
    : Object.freeze({ kind: "chu.Map-obstruction", failures: Object.freeze(failures) });
}

/** A Chu map from an adjoint pair, refusing a pair that is not adjoint. */
export function chuMap(source, target, forward, backward) {
  const judgment = checkChuMap(source, target, forward, backward);
  if (judgment.kind === "chu.Map-obstruction") throw new TypeError(`chuMap: not a Chu map (${judgment.failures.length} failure(s)); first: ${JSON.stringify(judgment.failures[0])}`);
  return Object.freeze({ kind: "chu.Map", source, target, forward, backward });
}

/** The identity map; adjointness is reflexivity. */
export const idChuMap = (space) => chuMap(space, space, (point) => point, (state) => state);

/** Composition: points run forward through both, states pull back through both in the opposite order. */
export function composeChuMaps(first, second) {
  if (!sameChuSpace(first.target, second.source)) throw new TypeError("composeChuMaps: first.target must be second.source");
  return chuMap(first.source, second.target, (point) => second.forward(first.forward(point)), (state) => first.backward(second.backward(state)));
}

/** The dual of a map, `(f, g) ↦ (g, f) : dual target → dual source`. */
export const dualChuMap = (map) => chuMap(dual(map.target), dual(map.source), map.backward, map.forward);

// — truth dominance —

/** Whether `dominating` is at least `dominated` in the truth order at every state: a witness naming each
 *  cell, or an obstruction naming a missing point or the cells where the inequality fails. */
export function checkPointTruthDominance(space, dominated, dominating) {
  const failures = [];
  if (pointIndex(space, dominated) < 0) failures.push(Object.freeze({ kind: "chu..truthDominance.domain-obstruction", role: "dominated", point: dominated }));
  if (pointIndex(space, dominating) < 0) failures.push(Object.freeze({ kind: "chu..truthDominance.domain-obstruction", role: "dominating", point: dominating }));
  const cells = [];
  if (failures.length === 0) {
    for (const state of space.states) {
      const dominatedReading = at(space, dominated, state), dominatingReading = at(space, dominating, state);
      const cell = Object.freeze({ state, dominatedReading, dominatingReading, holds: truthLeqReading(dominatedReading, dominatingReading) });
      cells.push(cell);
      if (!cell.holds) failures.push(Object.freeze({ kind: "chu..truthDominance.context-obstruction", cell }));
    }
  }
  return failures.length > 0
    ? Object.freeze({ kind: "chu..truthDominance-obstruction", dominated, dominating, failures: Object.freeze(failures) })
    : Object.freeze({ kind: "chu..truthDominance:witness", dominated, dominating, cells: Object.freeze(cells) });
}

/** The points no distinct point truth-dominates. */
export function truthDominanceFrontier(space) {
  const dominated = [];
  const frontier = space.points.filter((point) => {
    for (const candidate of space.points) {
      if (space.samePoint(point, candidate)) continue;
      const judgment = checkPointTruthDominance(space, point, candidate);
      if (judgment.kind === "chu..truthDominance:witness") { dominated.push(judgment); return false; }
    }
    return true;
  });
  return Object.freeze({ kind: "chu..truthDominanceFrontier", points: Object.freeze(frontier), dominated: Object.freeze(dominated) });
}

// — FOUR read *-autonomously —

/** `◇ a := a ⊗ k` at a fixed accessibility reading `k`. */
export const diamondAt = (k) => (a) => fusionReading(a, k);
/** `□ b := k ⊸ b` at a fixed accessibility reading `k`. */
export const boxAt = (k) => (b) => residuumReading(k, b);

/** Every Chu space on the given point and state names, at every `absent` reading. */
export function chuSpaceUniverse(points, states) {
  const names = readingFamilies.knowledge, cells = points.length * states.length, spaces = [];
  for (const absent of names) {
    for (let code = 0; code < names.length ** cells; code += 1) {
      let remaining = code;
      const assignment = [];
      for (let cell = 0; cell < cells; cell += 1) { assignment.push(names[remaining % names.length]); remaining = Math.floor(remaining / names.length); }
      spaces.push(chuSpace(points, states, (point, state) => assignment[points.indexOf(point) * states.length + states.indexOf(state)], { absent }));
    }
  }
  return Object.freeze(spaces);
}

/** The exhaustive finite receipt of the Chu laws: space-level laws over every space on the given carriers,
 *  FOUR's *-autonomy over all of FOUR (and FOUR³ for the adjunctions), and the map laws. */
export function chuLawReceipt(points = ["a", "b"], states = ["x", "y"]) {
  const spaces = chuSpaceUniverse(points, states);
  const names = readingFamilies.knowledge;
  const every = (predicate) => names.every(predicate);
  const everyTriple = (predicate) => names.every((a) => names.every((b) => names.every((c) => predicate(a, b, c))));
  const witnessed = (judgment) => judgment.kind === "chu.Map:witness";
  const dualInvolution = spaces.every((space) => sameChuSpace(dual(dual(space)), space));
  const transposeInvolution = spaces.every((space) => sameChuSpace(transpose(transpose(space)), space));
  const dualSwapsCarriers = spaces.every((space) => dual(space).points.join("\u0000") === space.states.join("\u0000") && dual(space).states.join("\u0000") === space.points.join("\u0000"));
  const fourNegateInvolution = every((a) => negateReading(negateReading(a)) === a);
  const tensorHomAdjunction = everyTriple((a, b, c) => truthLeqReading(fusionReading(a, b), c) === truthLeqReading(a, residuumReading(b, c)));
  const diamondAdjointBox = everyTriple((k, a, b) => truthLeqReading(diamondAt(k)(a), b) === truthLeqReading(a, boxAt(k)(b)));
  const identityAdjoint = spaces.every((space) => witnessed(checkChuMap(space, space, (point) => point, (state) => state)));
  const compositionAdjoint = spaces.every((space) => { const composed = composeChuMaps(idChuMap(space), idChuMap(space)); return witnessed(checkChuMap(composed.source, composed.target, composed.forward, composed.backward)); });
  const dualMapAdjoint = spaces.every((space) => { const dualed = dualChuMap(idChuMap(space)); return witnessed(checkChuMap(dualed.source, dualed.target, dualed.forward, dualed.backward)); });
  return Object.freeze({
    kind: "chu.Laws:witness",
    dualInvolution, transposeInvolution, dualSwapsCarriers, fourNegateInvolution,
    tensorHomAdjunction, fourStarAutonomous: tensorHomAdjunction && fourNegateInvolution, diamondAdjointBox,
    identityAdjoint, compositionAdjoint, dualMapAdjoint,
    spacesChecked: spaces.length,
  });
}

// — additives —

const tagged = (side, value) => canonical([side, value]);

/** The additive conjunction C & D: its points are pairs of points, its states the disjoint union of states,
 *  a pair read in a left state as its left point in C and in a right state as its right point in D. */
export function withChu(c, d) {
  const pairs = new Map();
  for (const a of c.points) for (const b of d.points) pairs.set(canonical([a, b]), [a, b]);
  const left = new Map(c.states.map((state) => [tagged("L", state), state]));
  const right = new Map(d.states.map((state) => [tagged("R", state), state]));
  return chuSpace([...pairs.keys()], [...left.keys(), ...right.keys()], (point, state) => {
    const pair = pairs.get(point);
    if (!pair) return c.absent;
    if (left.has(state)) return at(c, pair[0], left.get(state));
    if (right.has(state)) return at(d, pair[1], right.get(state));
    return c.absent;
  }, { absent: c.absent });
}

/** The additive disjunction C ⊕ D, the dual of &: points the disjoint union of points, states pairs of states. */
export function plusChu(c, d) {
  const left = new Map(c.points.map((point) => [tagged("L", point), point]));
  const right = new Map(d.points.map((point) => [tagged("R", point), point]));
  const pairs = new Map();
  for (const x of c.states) for (const y of d.states) pairs.set(canonical([x, y]), [x, y]);
  return chuSpace([...left.keys(), ...right.keys()], [...pairs.keys()], (point, state) => {
    const pair = pairs.get(state);
    if (!pair) return c.absent;
    if (left.has(point)) return at(c, left.get(point), pair[0]);
    if (right.has(point)) return at(d, right.get(point), pair[1]);
    return c.absent;
  }, { absent: c.absent });
}
