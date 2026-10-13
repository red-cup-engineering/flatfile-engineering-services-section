import { createRelationalField, defineRelation } from "@red-cup-engineering/computer-data-engineering-services-section/type-system/relations";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { admit } from "@red-cup-engineering/computer-data-engineering-services-section/type-system";
import { semanticGraphType } from "./semantic-carriers.mjs";
import { admitTypedMarkCarrier, referenceOf, typedMarkReferenceType } from "./typed-mark.mjs";
const accepted = (value) => Object.freeze({ ok: true, value });
const refused = (code, message) => Object.freeze({ ok: false, refusal: Object.freeze({ code, message }) });
const ordered = values => Object.freeze([...values].sort((left, right) => left.id.localeCompare(right.id)));
const names = values => Array.isArray(values) && values.length > 0 && values.every(value => typeof value === "string" && value.trim() !== "") && new Set(values).size === values.length;
function validRelation(relation) { return relation && typeof relation === "object" && typeof relation.id === "string" && relation.id.trim() !== "" && names(relation.subjectTypes) && names(relation.objectTypes) && names(relation.witnessTypes); }
function checkedReference(cells, reference, allowedTypes, role) {
  if (!reference || typeof reference !== "object") return refused("invalid-edge", `${role} must be a typed semantic reference`);
  const cell = cells.get(reference.id);
  if (!cell) return refused("unknown-cell", `${role} ${reference.id} is not a cell in this graph`);
  if (reference.type !== cell.type) return refused("type-mismatch", `${role} reference type does not match its cell`);
  if (!allowedTypes.includes(cell.type)) return refused("type-mismatch", `${role} type ${cell.type} is outside this predicate declaration`);
  return accepted(referenceOf(cell));
}
/** Admit a closed graph: identity-checked cells, declared predicate types, and member witnessed endpoints. */
export function createSignGraph(input) {
  if (!input || typeof input !== "object" || !Array.isArray(input.cells) || !Array.isArray(input.relations) || !Array.isArray(input.edges)) return refused("invalid-graph", "graph needs cells, relations, and edges");
  const cells = new Map();
  for (const supplied of input.cells) {
    const checked = admitTypedMarkCarrier(supplied);
    if (!checked.ok) return refused("invalid-cell", checked.refusal.message);
    if (cells.has(checked.value.id)) return refused("duplicate-cell", `cell ${checked.value.id} appears more than once`);
    cells.set(checked.value.id, checked.value);
  }
  const relations = new Map();
  for (const relation of input.relations) {
    if (!validRelation(relation)) return refused("invalid-relation", "relations require an id and nonempty unique endpoint and witness type sets");
    if (relations.has(relation.id)) return refused("duplicate-relation", `relation ${relation.id} appears more than once`);
    relations.set(relation.id, Object.freeze({ id: relation.id, subjectTypes: Object.freeze([...relation.subjectTypes].sort()), objectTypes: Object.freeze([...relation.objectTypes].sort()), witnessTypes: Object.freeze([...relation.witnessTypes].sort()) }));
  }
  const declarations = [];
  for (const relation of relations.values()) {
    const declared = defineRelation({ id: relation.id, domain: typedMarkReferenceType, codomain: typedMarkReferenceType, witness: typedMarkReferenceType });
    if (!declared.ok) return refused("invalid-relation", declared.refusal.message);
    declarations.push(declared.value);
  }
  const edges = [], keys = new Set();
  for (const edge of input.edges) {
    if (!edge || typeof edge !== "object" || typeof edge.predicate !== "string") return refused("invalid-edge", "edge must have typed subject, predicate, object, and witness references");
    const relation = relations.get(edge.predicate);
    if (!relation) return refused("unknown-predicate", `edge predicate ${edge.predicate} is undeclared`);
    const subject = checkedReference(cells, edge.subject, relation.subjectTypes, "subject"); if (!subject.ok) return subject;
    const object = checkedReference(cells, edge.object, relation.objectTypes, "object"); if (!object.ok) return object;
    const witness = checkedReference(cells, edge.witness, relation.witnessTypes, "witness"); if (!witness.ok) return witness;
    const normalized = Object.freeze({ subject: subject.value, predicate: relation.id, object: object.value, witness: witness.value });
    const key = semanticId(normalized);
    if (keys.has(key)) return refused("duplicate-edge", `edge ${key} appears more than once`);
    keys.add(key); edges.push(normalized);
  }
  const field = createRelationalField(declarations, edges);
  if (!field.ok) return refused("invalid-edge", field.refusal.message);
  const addressed = ordered(field.value.statements.map(statement => Object.freeze({ id: statement.id, edge: statement.statement })));
  const content = Object.freeze({ kind: "sign.graph", cells: ordered([...cells.values()]), relations: ordered([...relations.values()]), edges: addressed });
  const graph = Object.freeze({ ...content, id: semanticId(content) });
  const carrier = admit(semanticGraphType, graph);
  return carrier.ok ? accepted(graph) : refused("invalid-graph", "graph did not satisfy its shipped carrier schema");
}
export function edgesFrom(graph, subject) { const reference = subject?.kind === "sign.cell" ? referenceOf(subject) : subject; return Object.freeze(graph.edges.filter(entry => entry.edge.subject.id === reference.id)); }
/** Glue an entire family of graph cuts in one comparison. Identical relation
 * declarations, cells and edges agree by SCA identity; incompatible
 * declarations of the same predicate obstruct gluing on that predicate and
 * its edges, while compatible predicates still glue. The result is
 * permutation-invariant for this fixed family of cuts.
 *
 * IMPORTANT: with obstructions this is a *partial section projection*, not
 * an associative join of graphs. The returned graph has forgotten all
 * obstructed declarations and edges. Applying glueSignGraphs again to just
 * that projected graph can reintroduce a formerly obstructed predicate.
 * Retain the source cuts and obstruction receipt to revisit consistency;
 * do not treat a projection as a lossless CRDT state. */
export function glueSignGraphs(...graphs) {
  // Treat graph cuts as untrusted at the gluing boundary: reconstruct every
  // member and verify its content address before taking evidence from it.
  // A forged or stale graph must never enter a downstream decision projection.
  const verified = [];
  for (const graph of graphs) {
    if (!graph || !Array.isArray(graph.edges)) return refused("invalid-graph", "graph cut needs addressed edges");
    // Each persisted edge address is part of the claimed graph cut, not decoration.
    // Refuse an altered member identity even when recomputing the enclosing
    // graph would otherwise produce the advertised graph address.
    for (const entry of graph.edges) {
      if (!entry || typeof entry !== "object" || !entry.edge || entry.id !== semanticId(entry.edge))
        return refused("identity-mismatch", "graph cut contains an edge whose advertised identity does not match its content");
    }
    const checked = createSignGraph({
      cells: graph.cells,
      relations: graph.relations,
      edges: graph.edges.map(entry => entry.edge),
    });
    if (!checked.ok) return checked;
    if (checked.value.id !== graph.id) return refused("identity-mismatch", "graph cut's contents do not match its advertised identity");
    verified.push(checked.value);
  }
  const cells = new Map(), declarations = new Map(), edges = new Map();
  for (const graph of verified) {
    for (const cell of graph.cells) { const prior = cells.get(cell.id); if (prior && semanticId(prior) !== semanticId(cell)) return refused("duplicate-cell", `cell ${cell.id} has conflicting content across graph cuts`); cells.set(cell.id, cell); }
    for (const relation of graph.relations) {
      const told = declarations.get(relation.id) ?? new Map(), key = semanticId(relation), cuts = told.get(key) ?? { relation, graphs: [] };
      cuts.graphs.push(graph.id); told.set(key, cuts); declarations.set(relation.id, told);
    }
    for (const entry of graph.edges) edges.set(entry.id, entry.edge);
  }
  const relations = [], obstructions = [];
  for (const [id, told] of declarations) {
    if (told.size === 1) { relations.push([...told.values()][0].relation); continue; }
    obstructions.push(Object.freeze({ code: "conflicting-relation", relation: id, graphs: Object.freeze([...new Set([...told.values()].flatMap(cuts => cuts.graphs))].sort()) }));
  }
  const obstructed = new Set(obstructions.map(obstruction => obstruction.relation));
  const glued = createSignGraph({ cells: [...cells.values()], relations, edges: [...edges.values()].filter(edge => !obstructed.has(edge.predicate)) });
  if (!glued.ok) return glued;
  return accepted(Object.freeze({ graph: glued.value, obstructions: Object.freeze(obstructions.sort((left, right) => left.relation.localeCompare(right.relation))) }));
}
