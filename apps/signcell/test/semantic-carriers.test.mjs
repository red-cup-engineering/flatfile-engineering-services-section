import assert from "node:assert/strict";
import test from "node:test";
import { defineType } from "@red-cup-engineering/computer-data-engineering-services-section/type-system";
import { createTypedMark, admitTypedMark, referenceOf } from "../src/typed-mark.mjs";
import { createSignClaim, conflateClaims } from "../src/semantic-claim.mjs";
import { knowledgeReading } from "../src/cell.mjs";
import { createSignGraph, glueSignGraphs } from "../src/semantic-graph.mjs";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
const defined = defineType({ id: "test.semantic.source@1", name: "Semantic source", description: "A source used to prove carrier admission.", schema: { type: "object", required: ["text"], properties: { text: { type: "string", minLength: 1 } }, additionalProperties: false }, parents: [] });
if (!defined.ok) throw new Error(defined.refusal.message);
const cell = createTypedMark(defined.value, { text: "retained evidence" });
if (!cell.ok) throw new Error(cell.refusal.message);
test("a typed mark re-admits its typed content and address", () => {
  assert.equal(cell.value.id, "ni:///sha-256;oWtv3rlseG_wCqhX4zK65U-hu-WNpdG7G0abbboV1_w");
  assert.equal(admitTypedMark(defined.value, cell.value).ok, true);
  assert.equal(admitTypedMark(defined.value, { ...cell.value, id: "ni:wrong" }).ok, false);
});
test("semantic claim reads its knowledge from its witnesses and joins them", () => {
  const claim = createSignClaim({ subject: referenceOf(cell.value), predicate: "supports", object: referenceOf(cell.value), for: ["station-a"] });
  assert.equal(claim.ok, true);
  assert.equal(knowledgeReading(claim.value), "potential");
  const negative = createSignClaim({ subject: referenceOf(cell.value), predicate: "supports", object: referenceOf(cell.value), against: ["station-b"] });
  assert.equal(negative.ok, true);
  assert.equal(knowledgeReading(conflateClaims(claim.value, negative.value).value), "stable");
  assert.equal(createSignClaim({ subject: referenceOf(cell.value), predicate: "supports", object: referenceOf(cell.value), reading: "stable" }).ok, false);
});
test("semantic graph preserves typed endpoint and witness membership through admission and gluing", () => {
  const relation = { id: "supports", subjectTypes: [defined.value.id], objectTypes: [defined.value.id], witnessTypes: [defined.value.id] };
  const full = createSignGraph({ cells: [cell.value], relations: [relation], edges: [{ subject: referenceOf(cell.value), predicate: "supports", object: referenceOf(cell.value), witness: referenceOf(cell.value) }] });
  assert.equal(full.ok, true); if (!full.ok) return;
  assert.equal(full.value.id, "ni:///sha-256;sQ_icxkbBiToJI5qiTE8-TCdG9UL2p2n9wVT0Hj0XfE");
  assert.equal(full.value.edges[0].id, "ni:///sha-256;dG_VsLua-oJh5wddUB8sWBvroPZGLQghjmTsxP3zqiQ");
  const empty = createSignGraph({ cells: [cell.value], relations: [relation], edges: [] });
  assert.equal(empty.ok, true); if (!empty.ok) return;
  const glued = glueSignGraphs(empty.value, full.value);
  assert.equal(glued.ok, true); if (!glued.ok) return;
  assert.equal(glued.value.graph.edges.length, 1);
  assert.deepEqual(glued.value.obstructions, []);
  const wrong = createSignGraph({ cells: [cell.value], relations: [{ ...relation, witnessTypes: ["different@1"] }], edges: [{ subject: referenceOf(cell.value), predicate: "supports", object: referenceOf(cell.value), witness: referenceOf(cell.value) }] });
  assert.equal(wrong.ok, false);
  const other = { ...relation, objectTypes: [defined.value.id, "different@1"] };
  const elsewhere = createSignGraph({ cells: [cell.value], relations: [other], edges: [] });
  assert.equal(elsewhere.ok, true); if (!elsewhere.ok) return;
  const obstructed = glueSignGraphs(full.value, elsewhere.value);
  assert.equal(obstructed.ok, true); if (!obstructed.ok) return;
  assert.deepEqual([obstructed.value.graph.relations, obstructed.value.graph.edges, obstructed.value.graph.cells.length], [[], [], 1]);
  assert.deepEqual(obstructed.value.obstructions, [{ code: "conflicting-relation", relation: "supports", graphs: [full.value.id, elsewhere.value.id].sort() }]);
  assert.equal(glueSignGraphs(elsewhere.value, full.value).value.graph.id, obstructed.value.graph.id);
  assert.equal(glueSignGraphs().value.graph.cells.length, 0);
});


test("SignGraph gluing is permutation-invariant over compatible cuts and localizes schema obstructions", () => {
  const source = referenceOf(cell.value), type = defined.value.id;
  const supports = { id: "supports", subjectTypes: [type], objectTypes: [type], witnessTypes: [type] };
  const mentions = { ...supports, id: "mentions" };
  const opposedSupports = { ...supports, objectTypes: [type, "other.type@1"] };
  const edge = predicate => ({ subject: source, predicate, object: source, witness: source });
  const graph = (relations, edges) => {
    const admitted = createSignGraph({ cells: [cell.value], relations, edges });
    assert.equal(admitted.ok, true);
    return admitted.value;
  };
  const a = graph([supports], [edge("supports")]);
  const b = graph([mentions], [edge("mentions")]);
  const c = graph([opposedSupports], []);
  const expected = glueSignGraphs(a, b, c);
  assert.equal(expected.ok, true);
  assert.deepEqual(expected.value.graph.relations.map(r => r.id), ["mentions"]);
  assert.deepEqual(expected.value.graph.edges.map(e => e.edge.predicate), ["mentions"]);
  assert.deepEqual(expected.value.obstructions, [{
    code: "conflicting-relation",
    relation: "supports",
    graphs: [a.id, c.id].sort(),
  }]);

  for (const ordered of [
    [a, b, c], [a, c, b], [b, a, c],
    [b, c, a], [c, a, b], [c, b, a],
  ]) {
    const glued = glueSignGraphs(...ordered);
    assert.equal(glued.ok, true);
    assert.equal(glued.value.graph.id, expected.value.graph.id);
    assert.deepEqual(glued.value.obstructions, expected.value.obstructions);
  }

  const compatible = glueSignGraphs(a, b);
  assert.equal(compatible.ok, true);
  assert.deepEqual(compatible.value.obstructions, []);
  assert.deepEqual(compatible.value.graph.relations.map(r => r.id), ["mentions", "supports"]);
  assert.equal(compatible.value.graph.edges.length, 2);
});

test("a projected SignGraph after obstruction must not be re-glued as a lossless accumulator", () => {
  const source = referenceOf(cell.value), type = defined.value.id;
  const supports = { id: "supports", subjectTypes: [type], objectTypes: [type], witnessTypes: [type] };
  const opposed = { ...supports, witnessTypes: [type, "other.type@1"] };
  const graph = relation => {
    const accepted = createSignGraph({ cells: [cell.value], relations: [relation], edges: [] });
    assert.equal(accepted.ok, true);
    return accepted.value;
  };
  const a = graph(supports), b = graph(opposed);
  const projected = glueSignGraphs(a, b);
  assert.equal(projected.ok, true);
  assert.equal(projected.value.graph.relations.length, 0);
  assert.equal(projected.value.obstructions.length, 1);

  // The third source agrees with a, but the two incompatible original source
  // declarations remain. A one-shot 3-cut comparison still obstructs.
  const allCuts = glueSignGraphs(a, b, a);
  assert.equal(allCuts.ok, true);
  assert.equal(allCuts.value.graph.relations.length, 0);
  assert.equal(allCuts.value.obstructions.length, 1);

  // Regrafting from only the projected graph has thrown away that obstruction.
  const improperlyAccumulated = glueSignGraphs(projected.value.graph, a);
  assert.equal(improperlyAccumulated.ok, true);
  assert.equal(improperlyAccumulated.value.graph.relations.length, 1);
  assert.deepEqual(improperlyAccumulated.value.obstructions, []);
});

test("SignGraph gluing respects the EAVT member addresses issued by the relation layer", () => {
  const source = referenceOf(cell.value), type = defined.value.id;
  const relation = { id: "supports", subjectTypes: [type], objectTypes: [type], witnessTypes: [type] };
  const created = createSignGraph({
    cells: [cell.value], relations: [relation],
    edges: [{ subject: source, predicate: "supports", object: source, witness: source }],
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  // Regression: field statement IDs address {e,a,v,t}, not the source edge object.
  assert.notEqual(created.value.edges[0].id, semanticId(created.value.edges[0].edge));
  assert.equal(glueSignGraphs(created.value).ok, true);
  const forgedEdges = created.value.edges.map(entry => ({ ...entry, id: semanticId(entry.edge) }));
  const forgedContent = { kind: created.value.kind, cells: created.value.cells,
    relations: created.value.relations, edges: forgedEdges };
  const forged = { ...forgedContent, id: semanticId(forgedContent) };
  const refused = glueSignGraphs(forged);
  assert.equal(refused.ok, false);
  assert.equal(refused.refusal.code, "identity-mismatch");
});
