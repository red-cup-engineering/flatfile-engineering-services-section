// Finite directed evidence closure: a runnable powerset-stalk realization of
// TarskiSheafClosure's directed `driveFn`.  Every edge carries a finite table
// from source atoms to target atoms, so its action is monotone by construction
// and can be checked exhaustively before it is allowed to affect a readout.

const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const sortedUnique = (values) => [...new Set(values)].sort(compareText);
const isAtomList = (value) => Array.isArray(value) && value.every((atom) => typeof atom === "string" && atom.length > 0);
const own = (object, key) => Object.hasOwn(object, key);

function diagnostic(edge, code, message) {
  return Object.freeze({ edge, code, message });
}

function normalizeVertices(vertices) {
  if (!Array.isArray(vertices)) throw new TypeError("vertices must be an array");
  const known = new Map();
  for (const vertex of vertices) {
    if (vertex === null || typeof vertex !== "object" || typeof vertex.id !== "string" || vertex.id.length === 0) {
      throw new TypeError("every vertex needs a non-empty string id");
    }
    if (!isAtomList(vertex.basis) || !isAtomList(vertex.seed)) {
      throw new TypeError(`vertex ${vertex.id} needs finite basis and seed arrays of atoms`);
    }
    if (known.has(vertex.id)) throw new TypeError(`duplicate vertex id: ${vertex.id}`);
    const basis = sortedUnique(vertex.basis);
    const seed = sortedUnique(vertex.seed);
    if (seed.some((atom) => !basis.includes(atom))) {
      throw new TypeError(`vertex ${vertex.id} seed is not bounded by its basis`);
    }
    known.set(vertex.id, Object.freeze({ id: vertex.id, basis: Object.freeze(basis), seed: Object.freeze(seed) }));
  }
  return known;
}

function normalizeMap(map, source, target) {
  if (map === null || typeof map !== "object" || Array.isArray(map)) return { error: "map must be a finite atom-to-atoms object" };
  const table = new Map();
  for (const [atom, image] of Object.entries(map)) {
    if (!source.basis.includes(atom)) return { error: `map mentions source atom outside ${source.id}: ${atom}` };
    if (!isAtomList(image)) return { error: `map image for ${atom} must be an array of atoms` };
    const normalized = sortedUnique(image);
    const outside = normalized.find((value) => !target.basis.includes(value));
    if (outside !== undefined) return { error: `map image for ${atom} escapes target basis ${target.id}: ${outside}` };
    table.set(atom, Object.freeze(normalized));
  }
  // A finite table acts by union of its atom images. It is therefore
  // join-preserving, hence monotone, for every subset of the source basis.
  return { table };
}

function applyMap(table, values) {
  return sortedUnique(values.flatMap((atom) => table.get(atom) ?? []));
}

function tableSnapshot(table) {
  return Object.freeze(Object.fromEntries([...table].sort(([left], [right]) => compareText(left, right)).map(([atom, image]) => [atom, image])));
}

function stableValues(vertices, values) {
  return Object.freeze(Object.fromEntries([...vertices.keys()].sort(compareText).map((id) => [id, Object.freeze([...values.get(id)])])));
}

/**
 * Settle finite directed evidence.  Vertices are finite powerset stalks:
 * `{ id, basis, seed }`; an edge's JSON map sends each source atom to a finite
 * list of target atoms. Invalid edges are rejected and reported, never applied.
 */
export function settleEvidence({ vertices, edges, validateMap } = {}) {
  const known = normalizeVertices(vertices);
  if (!Array.isArray(edges)) throw new TypeError("edges must be an array");
  if (validateMap !== undefined && typeof validateMap !== "function") throw new TypeError("validateMap must be a function when supplied");

  const rejectedEdges = [];
  const accepted = [];
  const edgeIds = new Set();
  for (let index = 0; index < edges.length; index += 1) {
    const edge = edges[index];
    const edgeId = typeof edge?.id === "string" && edge.id.length > 0 ? edge.id : `edge:${index}`;
    if (edgeIds.has(edgeId)) {
      rejectedEdges.push(diagnostic(edgeId, "duplicate-edge-id", "every accepted edge needs a unique id"));
      continue;
    }
    edgeIds.add(edgeId);
    if (edge === null || typeof edge !== "object" || typeof edge.source !== "string" || typeof edge.target !== "string") {
      rejectedEdges.push(diagnostic(edgeId, "invalid-edge", "edge needs string source and target"));
      continue;
    }
    const source = known.get(edge.source);
    const target = known.get(edge.target);
    if (source === undefined || target === undefined) {
      rejectedEdges.push(diagnostic(edgeId, "unknown-endpoint", "edge source and target must name declared vertices"));
      continue;
    }
    const normalized = normalizeMap(edge.map, source, target);
    if (normalized.error !== undefined) {
      rejectedEdges.push(diagnostic(edgeId, "invalid-map", normalized.error));
      continue;
    }
    const validation = validateMap?.(Object.freeze({ id: edgeId, source, target, map: tableSnapshot(normalized.table) }));
    if (validation === false || typeof validation === "string") {
      rejectedEdges.push(diagnostic(edgeId, "rejected-by-validator", typeof validation === "string" ? validation : "validateMap returned false"));
      continue;
    }
    accepted.push(Object.freeze({ id: edgeId, source: edge.source, target: edge.target, table: normalized.table }));
  }

  const values = new Map([...known].map(([id, vertex]) => [id, [...vertex.seed]]));
  const witnesses = new Map([...known.keys()].map((id) => [id, new Map()]));
  for (const [id, vertex] of known) for (const atom of vertex.seed) witnesses.get(id).set(atom, Object.freeze({ kind: "seed" }));

  let iterations = 0;
  for (;;) {
    let changed = false;
    const next = new Map([...values].map(([id, atoms]) => [id, [...atoms]]));
    for (const edge of accepted) {
      const sourceValues = values.get(edge.source);
      for (const atom of applyMap(edge.table, sourceValues)) {
        const targetValues = next.get(edge.target);
        if (targetValues.includes(atom)) continue;
        targetValues.push(atom);
        witnesses.get(edge.target).set(atom, Object.freeze({ kind: "edge", edge: edge.id, source: edge.source, sourceAtoms: Object.freeze(sourceValues.filter((sourceAtom) => (edge.table.get(sourceAtom) ?? []).includes(atom))) }));
        changed = true;
      }
    }
    if (!changed) break;
    for (const [id, atoms] of next) values.set(id, sortedUnique(atoms));
    iterations += 1;
  }

  const normalizedWitnesses = Object.freeze(Object.fromEntries([...known.keys()].sort(compareText).map((id) => [id, Object.freeze(Object.fromEntries([...witnesses.get(id)].sort(([left], [right]) => compareText(left, right))))])));
  return Object.freeze({
    values: stableValues(known, values),
    iterations,
    rejectedEdges: Object.freeze(rejectedEdges),
    fixedPoint: true,
    witnesses: normalizedWitnesses,
  });
}
