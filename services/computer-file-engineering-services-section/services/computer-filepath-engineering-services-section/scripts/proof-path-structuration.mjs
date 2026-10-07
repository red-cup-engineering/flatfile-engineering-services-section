import { requireJsonValue } from "@red-cup-engineering/json-services-section/require-json-value";
import { sanitizeSegment, desanitizeSegment } from "../lib/segments.mjs";
export { sanitizeSegment, desanitizeSegment } from "../lib/segments.mjs";
/**
 * The recovered proof-pathing fold, normalized to the live file-service
 * boundary.  It is deliberately pure: the target atom and the witnesses are
 * data, and a path is returned only when those witnesses earn every step.
 */

export const GENERATORS = Object.freeze([
  "specialization",
  "converse",
  "subject-projection",
  "object-projection",
]         );

/**
 * SEN's small, transport-safe proof vocabulary.  A coordinate is a settled
 * term, rather than a pathname or a digest.  The file-path AST below is one
 * read-only rendering of a settlement coordinate.
 */

/** Settled proof coordinate. It is semantic material, not by itself an identity. */

/** A dynamic name is deliberately not assignable to ProofCoordinate. */

/** Public carriers always retain the coordinate; witnesses are boundary policy. */

/** A derived catalog entry.  Its address is an earned path, never a lookup key. */

/** An evictable, deterministic projection of successful proof-path derivations. */

/** The chart is a readout of catalogued proofs; it does not create evidence. */

class AdmissionError extends TypeError {
           code                                       ;

  constructor(code                                       , message        ) {
    super(message);
    this.code = code;
  }
}

const generatorRank = new Map                (GENERATORS.map((value, index) => [value, index]));
function canonicalValue(value) {
  try { requireJsonValue(value, "proof term"); }
  catch (error) { throw new AdmissionError("unaddressable-term", error.message); }
  const order = (item) => {
    if (item === null || typeof item !== "object") return Object.is(item, -0) ? 0 : item;
    if (Array.isArray(item)) return item.map(order);
    const out = {};
    for (const key of Object.keys(item).sort()) Object.defineProperty(out, key, { value: order(item[key]), enumerable: true });
    return out;
  };
  return order(value);
}

/** Collision-free local comparison key. This is not a content identity or external name. */
export function termKey(term                 )         {
  const value = canonicalValue(term);
  if (value === null) return "n:null";
  if (typeof value === "string") return `s:${value}`;
  if (typeof value === "boolean") return `b:${value}`;
  if (typeof value === "number") return `d:${JSON.stringify(value)}`;
  return `${Array.isArray(value) ? "a" : "o"}:${JSON.stringify(value)}`;
}

export const termSegment = (term                 )         => sanitizeSegment(termKey(term));

function isGenerator(value         )                     {
  return typeof value === "string" && generatorRank.has(value);
}

function witnessKey(witness                  )         {
  return JSON.stringify([termKey(witness.domain), generatorRank.get(witness.generator), termKey(witness.codomain)]);
}

/** Validate, sort, and structurally deduplicate direct generator evidence. */
export function normalizeWitnesses(values                             )                              {
  if (!Array.isArray(values)) throw new AdmissionError("invalid-witness", "witnesses must be an array");
  const found = new Map                          ();
  for (const value of values) {
    if (!value || typeof value !== "object" || !isGenerator(value.generator)) {
      throw new AdmissionError("invalid-witness", "every witness must name one canonical generator");
    }
    canonicalValue(value.domain);
    canonicalValue(value.codomain);
    const witness = Object.freeze({ domain: value.domain, generator: value.generator, codomain: value.codomain });
    found.set(witnessKey(witness), witness);
  }
  return Object.freeze([...found.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, witness]) => witness));
}

function resourceTypeOf(value         )         {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AdmissionError("invalid-request", "a proof coordinate requires a nonempty resource type");
  }
  return value;
}

function canonicalJson(value         )         {
  return JSON.stringify(canonicalValue(value));
}

/**
 * Settle a bounded proof coordinate. Identity is earned only after translating
 * this result into the canonical SEN term domain below.
 */
export function settleProofCoordinate(input   

 )                        {
  try {
    if (!input || typeof input !== "object") return Object.freeze({ ok: false, reason: "invalid-coordinate" });
    const resourceType = resourceTypeOf(input.resourceType);
    canonicalValue(input.root);
    canonicalValue(input.target);
    const witnesses = normalizeWitnesses(input.witnesses);
    const route = routeOf(witnesses, input.root, input.target);
    if (!route) return Object.freeze({ ok: false, reason: "unearned-coordinate" });
    const settlement                 = Object.freeze({
      type: "settlement",
      resourceType,
      root: input.root,
      target: input.target,
      witnesses,
    });
    return Object.freeze({
      ok: true,
      coordinate: Object.freeze({ type: "sen-proof-coordinate", version: 1, settlement }),
      route,
    });
  } catch (error) {
    if (error instanceof AdmissionError && error.code === "invalid-witness") {
      return Object.freeze({ ok: false, reason: "invalid-witness" });
    }
    if (error instanceof AdmissionError && error.message.includes("resource type")) {
      return Object.freeze({ ok: false, reason: "invalid-resource-type" });
    }
    return Object.freeze({ ok: false, reason: "invalid-coordinate" });
  }
}

/** Canonical JSON transport encoding, also suitable as input to a commitment actuator. */
export function encodeProofCoordinate(coordinate                 )         {
  const checked = settleProofCoordinate(coordinate?.settlement);
  if (!checked.ok || coordinate.type !== "sen-proof-coordinate" || coordinate.version !== 1) {
    throw new TypeError("a settled SEN proof coordinate is required");
  }
  return canonicalJson(checked.coordinate);
}

/**
 * Historical compact JSON rendering retained for compatibility. It is neither
 * SRN nor a content identity; identity consumers use the parent section adapter.
 */
export function renderProofCoordinate(coordinate                 )         {
  return `sen1:${sanitizeSegment(encodeProofCoordinate(coordinate))}`;
}

export function parseProofCoordinate(value        )                             {
  if (typeof value !== "string" || !value.startsWith("sen1:")) {
    return Object.freeze({ ok: false, reason: "malformed-coordinate" });
  }
  try {
    const encoded = desanitizeSegment(value.slice(5));
    const parsed          = JSON.parse(encoded);
    if (canonicalJson(parsed) !== encoded) return Object.freeze({ ok: false, reason: "noncanonical-coordinate" });
    if (!parsed || typeof parsed !== "object" || (parsed                      ).type !== "sen-proof-coordinate" || (parsed                         ).version !== 1) {
      return Object.freeze({ ok: false, reason: "malformed-coordinate" });
    }
    const settled = settleProofCoordinate((parsed                          ).settlement);
    if (!settled.ok) return Object.freeze({ ok: false, reason: settled.reason === "unearned-coordinate" ? "unearned-coordinate" : "malformed-coordinate" });
    if (encodeProofCoordinate(settled.coordinate) !== encoded) return Object.freeze({ ok: false, reason: "noncanonical-coordinate" });
    return Object.freeze({ ok: true, coordinate: settled.coordinate });
  } catch {
    return Object.freeze({ ok: false, reason: "malformed-coordinate" });
  }
}

/** POSIX remains an optional rendering/projection of the settled coordinate. */
export function proofPathOfCoordinate(coordinate                 )                   {
  const settled = settleProofCoordinate(coordinate?.settlement);
  if (!settled.ok || coordinate.type !== "sen-proof-coordinate" || coordinate.version !== 1) {
    throw new TypeError("an earned SEN proof coordinate is required");
  }
  return astOfRoute(settled.route);
}

/** Attach externally produced crypto evidence without confusing it with identity. */
export function envelopeProofCoordinate(coordinate                 , witnesses                                  = [])                {
  encodeProofCoordinate(coordinate);
  if (!Array.isArray(witnesses)) throw new TypeError("cryptographic witnesses must be an array");
  const normalized = witnesses.map((witness) => {
    if (!witness || typeof witness !== "object" || !["commitment", "merkle", "signature", "anchor-5615611"].includes(witness.type)
      || typeof witness.algorithm !== "string" || witness.algorithm === "" || typeof witness.value !== "string" || witness.value === "") {
      throw new TypeError("a cryptographic witness requires type, algorithm, and value");
    }
    return Object.freeze({ type: witness.type, algorithm: witness.algorithm, value: witness.value });
  }).sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));
  return Object.freeze({ type: "sen-proof-envelope", coordinate, witnesses: Object.freeze(normalized) });
}

const cell = (subject                 , predicate                 , object                 )                 =>
  Object.freeze({ subject, predicate, object });

/** Recover the four generator classes from relational cells, preserving the old f* direction. */
export function witnessesOfCells(
  cells                           ,
  specializationPredicate                  = "is-a",
)                              {
  if (!Array.isArray(cells)) throw new AdmissionError("invalid-witness", "context must be an array of relational cells");
  const specializationKey = termKey(specializationPredicate);
  const witnesses                     = [];
  for (const value of cells) {
    if (!value || typeof value !== "object" || !("subject" in value) || !("predicate" in value) || !("object" in value)) {
      throw new AdmissionError("invalid-witness", "every context entry must be a relational cell");
    }
    canonicalValue(value.subject);
    canonicalValue(value.predicate);
    canonicalValue(value.object);
    if (termKey(value.predicate) === specializationKey) {
      witnesses.push({ domain: value.object, generator: "specialization", codomain: value.subject });
      continue;
    }
    const node = cell(value.subject, value.predicate, value.object);
    witnesses.push(
      { domain: node, generator: "converse", codomain: cell(value.object, value.predicate, value.subject) },
      { domain: node, generator: "subject-projection", codomain: value.subject },
      { domain: node, generator: "object-projection", codomain: value.object },
    );
  }
  return normalizeWitnesses(witnesses);
}

/** Canonical shortest route. Sorted witnesses make equal-length tie-breaking independent of input order. */
export function routeOf(
  witnesses                             ,
  root                 ,
  target                 ,
)                    {
  const normalized = normalizeWitnesses(witnesses);
  const rootKey = termKey(root);
  const targetKey = termKey(target);
  if (rootKey === targetKey) return Object.freeze({ root, steps: Object.freeze([]) });

  const adjacency = new Map                            ();
  for (const witness of normalized) {
    const key = termKey(witness.domain);
    const outgoing = adjacency.get(key) ?? [];
    outgoing.push(witness);
    adjacency.set(key, outgoing);
  }
  const queue = [rootKey];
  const predecessor = new Map([[rootKey, null]]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    for (const witness of adjacency.get(current) ?? []) {
      const key = termKey(witness.codomain);
      if (predecessor.has(key)) continue;
      predecessor.set(key, { from: current, witness });
      if (key === targetKey) {
        const steps = [];
        for (let at = key; at !== rootKey;) {
          const previous = predecessor.get(at);
          steps.push(Object.freeze({ generator: previous.witness.generator, node: previous.witness.codomain }));
          at = previous.from;
        }
        return Object.freeze({ root, steps: Object.freeze(steps.reverse()) });
      }
      queue.push(key);
    }
  }
  return null;
}

function nodeOf(term                 , role                     )                  {
  const key = termKey(term);
  return Object.freeze({ type: "term-segment", role, key, segment: sanitizeSegment(key) });
}

export function astOfRoute(route            )                   {
  return Object.freeze({
    type: "posix-filepath",
    absolute: false,
    root: nodeOf(route.root, "root"),
    steps: Object.freeze(route.steps.map((step) => Object.freeze({
      type: "proof-step",
      generator: step.generator,
      namespace: "library",
      node: nodeOf(step.node, "codomain"),
    }))),
  });
}

export function renderProofPathAst(ast                  )         {
  let path = ast.root.segment;
  for (const step of ast.steps) path += `/${step.generator}/${step.namespace}/${step.node.segment}`;
  return path;
}

function isCanonicalTermKey(key        )          {
  if (key.startsWith("s:")) return true;
  if (key === "n:null" || key === "b:true" || key === "b:false") return true;
  const separator = key.indexOf(":");
  if (separator !== 1 || !["d", "a", "o"].includes(key[0] )) return false;
  try {
    const value = JSON.parse(key.slice(2));
    if (key[0] === "d" && typeof value !== "number") return false;
    if (key[0] === "a" && !Array.isArray(value)) return false;
    if (key[0] === "o" && (value === null || Array.isArray(value) || typeof value !== "object")) return false;
    return termKey(value) === key;
  } catch {
    return false;
  }
}

function parsedNode(segment        , role                     )                  {
  const key = desanitizeSegment(segment);
  if (!isCanonicalTermKey(key)) throw new AdmissionError("invalid-request", "path segment is not a canonical term key");
  return Object.freeze({ type: "term-segment", role, key, segment });
}

export function parseProofPath(path        )                       {
  if (typeof path !== "string" || path === "" || path.startsWith("/") || path.endsWith("/")) {
    return Object.freeze({ ok: false, reason: "malformed-path" });
  }
  const parts = path.split("/");
  if ((parts.length - 1) % 3 !== 0) return Object.freeze({ ok: false, reason: "malformed-path" });
  try {
    const root = parsedNode(parts[0] , "root");
    const steps                  = [];
    for (let index = 1; index < parts.length; index += 3) {
      const generator = parts[index];
      if (!isGenerator(generator) || parts[index + 1] !== "library") {
        return Object.freeze({ ok: false, reason: "malformed-path" });
      }
      steps.push(Object.freeze({
        type: "proof-step",
        generator,
        namespace: "library",
        node: parsedNode(parts[index + 2] , "codomain"),
      }));
    }
    const ast = Object.freeze({ type: "posix-filepath"         , absolute: false         , root, steps: Object.freeze(steps) });
    if (renderProofPathAst(ast) !== path) return Object.freeze({ ok: false, reason: "noncanonical-path" });
    return Object.freeze({ ok: true, ast });
  } catch {
    return Object.freeze({ ok: false, reason: "noncanonical-path" });
  }
}

export function checkProofPathAst(ast                  , witnesses                             )          {
  try {
    if (!ast || ast.type !== "posix-filepath" || ast.absolute !== false || !ast.root || !Array.isArray(ast.steps)) return false;
    if (ast.root.type !== "term-segment" || ast.root.role !== "root" || !isCanonicalTermKey(ast.root.key) || sanitizeSegment(ast.root.key) !== ast.root.segment) return false;
    const edges = new Set(normalizeWitnesses(witnesses).map(witnessKey));
    let domainKey = ast.root.key;
    for (const step of ast.steps) {
      if (!step || step.type !== "proof-step" || !isGenerator(step.generator) || step.namespace !== "library" || !step.node) return false;
      if (step.node.type !== "term-segment" || step.node.role !== "codomain" || !isCanonicalTermKey(step.node.key) || sanitizeSegment(step.node.key) !== step.node.segment) return false;
      const edge = JSON.stringify([domainKey, generatorRank.get(step.generator), step.node.key]);
      if (!edges.has(edge)) return false;
      domainKey = step.node.key;
    }
    return true;
  } catch {
    return false;
  }
}

/** The one public fold requested by the section. It never throws for admitted call shapes. */
export function structureSemioticAtom                           (request                         )                         {
  const atom = request?.atom;
  const refusal = (reason             , witnessCount = 0)                         => Object.freeze({
    ok: false,
    atom,
    reason,
    diagnostics: Object.freeze({ witnessCount, stepCount: 0 }),
  });
  try {
    if (!request || typeof request !== "object" || !("atom" in request) || !("root" in request)) return refusal("invalid-request");
    canonicalValue(atom);
    canonicalValue(request.root);
    const carriesContext = Object.hasOwn(request, "context");
    const carriesWitnesses = Object.hasOwn(request, "witnesses");
    if (carriesContext === carriesWitnesses) return refusal("ambiguous-evidence");

    const witnesses = carriesContext
      ? witnessesOfCells(request.context , request.specializationPredicate ?? "is-a")
      : normalizeWitnesses(request.witnesses );
    const route = routeOf(witnesses, request.root, atom);
    if (!route) return refusal("unearned-path", witnesses.length);
    const ast = astOfRoute(route);
    if (!checkProofPathAst(ast, witnesses)) return refusal("invalid-witness", witnesses.length);
    return Object.freeze({
      ok: true,
      atom,
      ast,
      diagnostics: Object.freeze({ witnessCount: witnesses.length, stepCount: ast.steps.length }),
    });
  } catch (error) {
    return refusal(error instanceof AdmissionError ? error.code : "invalid-request");
  }
}

/**
 * Derive a stable catalog from independently supplied proof requests.  Failed
 * derivations remain typed refusals and never become catalog entries.
 */
export function catalogProofPaths                           (
  requests                                    ,
)                      {
  if (!Array.isArray(requests)) throw new TypeError("proof-path catalog requests must be an array");
  const entries = new Map                                  ();
  const refusals                           = [];
  for (const request of requests) {
    const result = structureSemioticAtom(request);
    if (!result.ok) {
      refusals.push(result);
      continue;
    }
    const address = renderProofPathAst(result.ast);
    entries.set(address, Object.freeze({ atom: result.atom, address, ast: result.ast }));
  }
  return Object.freeze({
    type: "proof-path-catalog",
    entries: Object.freeze([...entries.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, entry]) => entry)),
    refusals: Object.freeze(refusals),
  });
}

const chartNodeOf = (node                 )                     => Object.freeze({
  type: "proof-path-chart-node",
  role: node.role,
  key: node.key,
  segment: node.segment,
});

const chartNodeKey = (node                    )         => `${node.role}\u0000${node.key}`;

/**
 * Project an evictable graph from the catalog's earned edges.  The projection
 * is intentionally unable to add edges that were not present in a proof.
 */
export function chartProofPathCatalog(catalog                  )                 {
  if (!catalog || catalog.type !== "proof-path-catalog" || !Array.isArray(catalog.entries)) {
    throw new TypeError("proof-path chart requires a proof-path catalog");
  }
  const nodes = new Map                            ();
  const edges = new Map                            ();
  const nodeOf = (node                 )                     => {
    const candidate = chartNodeOf(node);
    const key = chartNodeKey(candidate);
    const known = nodes.get(key);
    if (known) return known;
    nodes.set(key, candidate);
    return candidate;
  };
  for (const entry of catalog.entries) {
    let from = nodeOf(entry.ast.root);
    for (const step of entry.ast.steps) {
      const to = nodeOf(step.node);
      const key = `${chartNodeKey(from)}\u0000${step.generator}\u0000${chartNodeKey(to)}`;
      edges.set(key, Object.freeze({ type: "proof-path-chart-edge", from, generator: step.generator, to }));
      from = to;
    }
  }
  return Object.freeze({
    type: "proof-path-chart",
    nodes: Object.freeze([...nodes.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, node]) => node)),
    edges: Object.freeze([...edges.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, edge]) => edge)),
  });
}
