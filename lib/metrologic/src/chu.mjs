/**
 * chu — Chu spaces over FOUR.
 *
 * A Chu space is a matrix r : points × states → FOUR, its entries readings in the
 * knowledge family (the data layer's four). Points and states are indices,
 * distinguished by default by their scalar/reference identity. Distinct Mark
 * presentations require a separately admitted observational equivalence to be
 * identified. Rows are a point's costates; columns a state's extensions;
 * `transpose` swaps points and
 * states and `dual` also negates every entry (the linear-logic dual (–)^⊥). A Chu
 * map between two spaces is an adjoint pair — forward on points, backward on
 * states — with r_target(f a, x) = r_source(a, g x) on every cell (Chu 1979; Pratt
 * 1995). FOUR itself is *-autonomous under its fusion and residuum, and
 * `chuLawReceipt` checks every law exhaustively over small carriers.
 */
import { readingAs, readingFamilies, readingSchema, samePoint as sameReading, sidesOfReading, fusionReading, knowledgeJoinReading, negateReading, residuumReading, truthLeqReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";

/** Index identity is NOT observational Mark equivalence. A caller wishing to
 * identify separately presented objects supplies a measured samePoint/sameState
 * relation; SignCell may separately supply NI presentation coincidence. */
const defaultSame = Object.is;
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
    if (!points.some((p) => samePoint(p, point)) ||
        !states.some((s) => sameState(s, state)))
      throw new RangeError("chuSpaceOfEntries: entry addresses undeclared point or state");
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

/** A point's witnesses: its settled reading and the original states whose entry
 *  tells it for, and against, in carrier order. Display names and sorting belong
 *  to a downstream readout; neither may identify distinct state coordinates. */
export function pointWitnesses(space, point) {
  const line = row(space, point);
  const telling = (side) => line.filter((cell) => sidesOfReading(cell.reading)[side]).map((cell) => cell.state);
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

/** Assay one finite point/state image per input. Later source callback changes
 * cannot change the carrier maps returned by chuMap. */
function assayChuMap(source, target, forward, backward) {
  const failures = [];
  const forwardImages = Object.freeze(source.points.map((point) => {
    const mapped = forward(point), i = pointIndex(target, mapped);
    if (i < 0) failures.push(Object.freeze({ kind: "chu.Map.domain-failure", leg: "forward", from: point, mapped }));
    return i < 0 ? undefined : target.points[i];
  }));
  const backwardImages = Object.freeze(target.states.map((state) => {
    const mapped = backward(state), i = stateIndex(source, mapped);
    if (i < 0) failures.push(Object.freeze({ kind: "chu.Map.domain-failure", leg: "backward", from: state, mapped }));
    return i < 0 ? undefined : source.states[i];
  }));
  if (failures.length === 0) {
    source.points.forEach((point, i) => target.states.forEach((state, j) => {
      const left = at(target, forwardImages[i], state), right = at(source, point, backwardImages[j]);
      if (left !== right) failures.push(Object.freeze({ kind: "chu.Map.adjointness-failure", point, state, target: left, source: right }));
    }));
  }
  return Object.freeze({ failures: Object.freeze(failures), forwardImages, backwardImages });
}

/** Read a candidate once per declared carrier, rather than silently sampling
 * different outputs of an effectful function during the same Chu-map assay. */
export function checkChuMap(source, target, forward, backward) {
  const { failures } = assayChuMap(source, target, forward, backward);
  return failures.length === 0
    ? Object.freeze({ kind: "chu.Map:witness", failures })
    : Object.freeze({ kind: "chu.Map-obstruction", failures });
}

/** A persistent certified map holds its admitted finite images, not untrusted
 * original callbacks. An out-of-carrier later application is refused. */
export function chuMap(source, target, forward, backward) {
  const { failures, forwardImages, backwardImages } = assayChuMap(source, target, forward, backward);
  if (failures.length > 0) throw new TypeError(`chuMap: not a Chu map (${failures.length} failure(s)); first: ${JSON.stringify(failures[0])}`);
  const fwd = (point) => {
    const i = pointIndex(source, point);
    if (i < 0) throw new RangeError("chuMap: point outside source carrier");
    return forwardImages[i];
  };
  const bwd = (state) => {
    const i = stateIndex(target, state);
    if (i < 0) throw new RangeError("chuMap: state outside target carrier");
    return backwardImages[i];
  };
  return Object.freeze({ kind: "chu.Map", source, target, forward: fwd, backward: bwd });
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

// Product coordinates retain both original occurrences. A sum coordinate tags
// its original occurrence with L/R. Neither construction interprets contents or
// promotes a serialization coincidence into the operands' admitted identity.
const pair = (left, right) => Object.freeze([left, right]);
const isPair = (value) => Array.isArray(value) && value.length === 2;
const sameProduct = (sameLeft, sameRight) => (left, right) =>
  isPair(left) && isPair(right)
  && sameLeft(left[0], right[0]) && sameRight(left[1], right[1]);
const sameSum = (sameLeft, sameRight) => (left, right) =>
  isPair(left) && isPair(right) && left[0] === right[0]
  && (left[0] === "L" ? sameLeft(left[1], right[1])
    : left[0] === "R" && sameRight(left[1], right[1]));

/** The additive conjunction C & D: points are frozen [C point, D point] pairs;
 *  states are frozen ["L", C state] / ["R", D state] pairs. Each leg uses its
 *  operand's admitted identity, and a cell reads the corresponding original
 *  matrix. These are mathematical coordinates, not encoded wire addresses. */
export function withChu(c, d) {
  const points = c.points.flatMap((a) => d.points.map((b) => pair(a, b)));
  const states = [
    ...c.states.map((state) => pair("L", state)),
    ...d.states.map((state) => pair("R", state)),
  ];
  return chuSpace(points, states, ([a, b], [side, state]) =>
    side === "L" ? at(c, a, state) : at(d, b, state), {
    absent: c.absent,
    samePoint: sameProduct(c.samePoint, d.samePoint),
    sameState: sameSum(c.sameState, d.sameState),
  });
}

/** The additive disjunction C ⊕ D is (C^⊥ & D^⊥)^⊥. Its points are tagged
 *  original points, and its states are pairs of original states. Reuse the
 *  same product/sum construction and admitted identities through duality. */
export const plusChu = (c, d) => dual(withChu(dual(c), dual(d)));
