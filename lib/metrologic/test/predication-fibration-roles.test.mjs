import test from "node:test";
import assert from "node:assert/strict";
import {
  cellSignatureKey, signatureOfCell, finitePredicationValuation,
  objectSignatureKey, predicationCategoryShadow, incomingArrows, yonedaRecovery,
  embedding, reindexValuation, reindexBilatticeHomomorphism,
} from "../src/articulation/predicating/fibration.mjs";
import {
  fusionReading, residuumReading, truthMeetReading, truthImplyReading,
} from "@red-cup-engineering/computer-data-engineering-services-section/four";

const cell = (subject, predicate, object) =>
  Object.freeze({ kind: "predication.cellSignature", subject, predicate, object });

test("predication positions preserve distinct roles even when their text contains delimiters", () => {
  const a = cell("maker|receipt", "ACK", "case");
  const b = cell("maker", "receipt|ACK", "case");
  assert.notEqual(cellSignatureKey(a), cellSignatureKey(b));
  const map = Object.fromEntries([
    [cellSignatureKey(a), "potential"],
    [cellSignatureKey(b), "active"],
  ]);
  const valuation = finitePredicationValuation([a, b], map);
  assert.equal(valuation.cells.length, 2);
  assert.equal(valuation.values[cellSignatureKey(a)], "potential");
  assert.equal(valuation.values[cellSignatureKey(b)], "active");
  assert.deepEqual(JSON.parse(cellSignatureKey(a)), ["maker|receipt", "ACK", "case"]);
});

test("structured Mark values are serialized without equating different presented roles", () => {
  const present = (value) => ({ mark: { value } });
  const x = signatureOfCell({
    subject: present({ b: ["a|b"], a: 1 }),
    predicate: present({ name: "ack", mode: { status: "contested" } }),
    object: present(["value", { right: true, left: false }]),
  });
  const y = signatureOfCell({
    subject: present({ a: 1, b: ["a|b"] }),
    predicate: present({ mode: { status: "contested" }, name: "ack" }),
    object: present(["value", { left: false, right: true }]),
  });
  assert.equal(cellSignatureKey(x), cellSignatureKey(y), "same serialized payload has the same projected signature");
  assert.equal(x.kind, "predication.cellSignature");
});

test("valuation refuses an absent reading and duplicate positions instead of silently overwriting", () => {
  const a = cell("s", "p", "o");
  const key = cellSignatureKey(a);
  assert.throws(() => finitePredicationValuation([a], {}), /missing value/);
  assert.throws(() => finitePredicationValuation([a, a], { [key]: "potential" }), /duplicate cell/);
  assert.throws(() => cellSignatureKey({ subject: "s", predicate: "p" }), /three string roles/);
});

test("embedding is a resource-indexed function, not a last-writer-wins relation", () => {
  const a = cell("sender", "WIT", "claim");
  const b = cell("receiver", "ACK", "claim");
  const c = cell("observer", "ATT", "ack");
  const host = finitePredicationValuation([b, c], {
    [cellSignatureKey(b)]: "stable",
    [cellSignatureKey(c)]: "active",
  });
  assert.throws(() => embedding([[a, b], [a, c]]), /repeats a resource position/);
  const distinct = embedding([[a, b], [c, b]]);
  const read = reindexValuation(distinct, host);
  assert.equal(read.values[cellSignatureKey(a)], "stable");
  assert.equal(read.values[cellSignatureKey(c)], "stable");
  assert.equal(read.cells.length, 2);
});

test("fibration preserves actual multiplicative fusion and residuation, not their additive shadows", () => {
  const a = cell("claim", "WIT", "yes");
  const b = cell("claim", "ACK", "yes");
  const k1 = cellSignatureKey(a), k2 = cellSignatureKey(b);
  const first = finitePredicationValuation([a,b], { [k1]: "potential", [k2]: "stable" });
  const second = finitePredicationValuation([a,b], { [k1]: "active", [k2]: "potential" });
  const pullback = embedding([[a, b], [b, a]]);
  const receipt = reindexBilatticeHomomorphism(pullback, first, second);
  assert.equal(receipt.preservesFusion, true);
  assert.equal(receipt.preservesResidual, true);
  const values = ["absurd", "potential", "active", "stable"];
  assert.ok(values.some(a => values.some(b => fusionReading(a,b) !== truthMeetReading(a,b))),
    "the multiplicative and additive operators must not be conflated");
  assert.ok(values.some(a => values.some(b => residuumReading(a,b) !== truthImplyReading(a,b))),
    "the multiplicative residual and Heyting implication must not be conflated");
});


test("same presented Mark stays distinct as term, predicate, and cell objects", () => {
  const term = { kind: "predication.term", mark: { value: "x" } };
  const predicate = { kind: "predication.predicate", mark: { value: "x" } };
  const different = { kind: "predication.term", mark: { value: "y" } };
  const base = { objects: [term, predicate, different],
    specialization: [], converse: [], subjectProjection: [], objectProjection: [] };
  const category = predicationCategoryShadow({ base, cells: { cells: [] } });
  const objects = category.objects;
  assert.equal(objects.length, 3);
  const termObject = objects.find(o => o.objectKind === "term" && o.key === '"x"');
  const predicateObject = objects.find(o => o.objectKind === "predicate");
  const termRef = objectSignatureKey(termObject);
  const predicateRef = objectSignatureKey(predicateObject);
  assert.notEqual(termRef, predicateRef);
  assert.deepEqual(JSON.parse(termRef), ["term", '"x"']);
  assert.deepEqual(JSON.parse(predicateRef), ["predicate", '"x"']);
  assert.equal(incomingArrows(category, termRef).length, 1);
  assert.equal(incomingArrows(category, predicateObject).length, 1);
  assert.notEqual(incomingArrows(category, termRef)[0].to, incomingArrows(category, predicateRef)[0].to);
  const recovered = yonedaRecovery(category, termObject, predicateObject);
  assert.equal(recovered.sameObject, false);
  assert.equal(recovered.sameIncomingBundle, false);
  assert.equal(recovered.objectRecoveredFromArrows, true);
  assert.throws(() => incomingArrows(category, '"x"'), /existing typed object reference/);
  assert.throws(() => incomingArrows(category, "never-seen"), /existing typed object reference/);
});

test("category projections retain typed endpoints, never an unqualified source string", () => {
  const subj = { kind: "predication.term", mark: { value: "human" } };
  const pred = { kind: "predication.predicate", mark: { value: "notices" } };
  const obj = { kind: "predication.term", mark: { value: "event" } };
  const base = { objects: [subj, pred, obj], specialization: [],
    converse: [], subjectProjection: [], objectProjection: [] };
  base.subjectProjection.push({ domain: [subj, pred, obj], codomain: subj });
  const cell = { subject: subj, predicate: pred, object: obj };
  const category = predicationCategoryShadow({ base, cells: { cells: [cell] } });
  const projected = category.arrows.find(x => x.generator === "subjectProjection");
  assert.ok(projected);
  assert.deepEqual(JSON.parse(projected.from)[0], "cell");
  assert.deepEqual(JSON.parse(projected.to)[0], "term");
  assert.ok(category.arrows.some(x => x.generator === "identity" && x.from === projected.from));
  assert.ok(category.arrows.some(x => x.generator === "identity" && x.from === projected.to));
  assert.equal(incomingArrows(category, projected.to).some(x => x.name === projected.name), true);
});


test("native SignGraph generated-site carrier projects raw data terms, predicate roles and all arrow endpoints", () => {
  // This is the exact baseCategory shape SignGraph.site produces:
  // entities/predicates as {sort,term}; cells as a plain triple array;
  // converse and projection maps carry raw terms, not predication wrappers.
  const cell = { subject: "actor", predicate: "ack", object: "other" };
  const converse = { subject: "other", predicate: "ack", object: "actor" };
  const native = {
    kind: "signgraph.site",
    cells: [cell],
    base: {
      kind: "signgraph.base",
      objects: [
        { sort: "entity", term: "actor" },
        { sort: "entity", term: "other" },
        { sort: "predicate", term: "ack" },
      ],
      specialization: [],
      converse: [{ domain: ["actor", "ack", "other"], codomain: ["other", "ack", "actor"] }],
      subjectProjection: [{ domain: ["actor", "ack", "other"], codomain: "actor" }],
      objectProjection: [{ domain: ["actor", "ack", "other"], codomain: "other" }],
    },
  };
  const projected = predicationCategoryShadow(native);
  const refs = new Set(projected.objects.map(objectSignatureKey));
  assert.equal(projected.objects.length, 5,
    "three role-tagged terms and two directed cells, including the generated converse");
  assert.equal(projected.arrows.filter(a => a.generator === "identity").length, 5);
  assert.equal(projected.arrows.filter(a => a.generator !== "identity").length, 3);
  assert.ok(projected.arrows.every(a => refs.has(a.from) && refs.has(a.to)),
    "no arrow may point outside the generated category");
  const converseLeg = projected.arrows.find(a => a.generator === "converse");
  assert.deepEqual(JSON.parse(converseLeg.from)[0], "cell");
  assert.deepEqual(JSON.parse(converseLeg.to)[0], "cell");
  assert.notEqual(converseLeg.from, converseLeg.to);
  assert.equal(incomingArrows(projected, converseLeg.to).length, 2,
    "identity and arriving converse are distinct");
  assert.equal(yonedaRecovery(projected, converseLeg.from, converseLeg.to).sameObject, false);
});

test("native specialization preserves predicate sort even when the same text is an entity", () => {
  const native = {
    cells: [{ subject: "ack", predicate: "ack", object: "body" }],
    base: {
      objects: [{ sort: "entity", term: "ack" }, { sort: "entity", term: "body" },
        { sort: "predicate", term: "ack" }, { sort: "predicate", term: "noticed" }],
      specialization: [{ domain: "ack", codomain: "noticed" }],
      converse: [], subjectProjection: [], objectProjection: [],
    },
  };
  const category = predicationCategoryShadow(native);
  const term = category.objects.find(o => o.objectKind === "term" && o.key === '"ack"');
  const predicate = category.objects.find(o => o.objectKind === "predicate" && o.key === '"ack"');
  assert.ok(term && predicate);
  assert.notEqual(objectSignatureKey(term), objectSignatureKey(predicate));
  const specialization = category.arrows.find(a => a.generator === "specialization");
  assert.equal(specialization.from, objectSignatureKey(predicate));
  assert.deepEqual(JSON.parse(specialization.to), ["predicate", '"noticed"']);
  assert.ok(category.arrows.some(a => a.generator === "identity" && a.from === specialization.to));
});

test("schematic Mark content is projected without imposing technological addresses or string-only payloads", () => {
  const present = value => ({ kind: "utterance.mark", value });
  const source = signatureOfCell({
    subject: present({ label: "maker", nested: [true, null, 17] }),
    predicate: present("ACK"),
    object: present(["receiver", { value: 9 }]),
  });
  assert.deepEqual(JSON.parse(source.subject),
    { label: "maker", nested: [true, null, 17] });
  assert.deepEqual(JSON.parse(source.object), ["receiver", { value: 9 }]);
  assert.notEqual(cellSignatureKey(source), cellSignatureKey(signatureOfCell({
    subject: present(["receiver", { value: 9 }]),
    predicate: present("ACK"),
    object: present({ label: "maker", nested: [true, null, 17] }),
  })));
});

test("malformed base arrows and absent site components refuse before fabricating a category", () => {
  assert.throws(() => predicationCategoryShadow({ cells: [], base: { objects: [] } }),
    /generated base and cells/);
  const base = { objects: [], specialization: [], converse: [],
    subjectProjection: [], objectProjection: [] };
  assert.throws(() => predicationCategoryShadow({
    cells: [], base: { ...base, converse: [{ domain: ["a", "p"], codomain: ["b", "p", "a"] }] },
  }), /needs three roles/);
  assert.throws(() => signatureOfCell({ subject: "a", predicate: "p" }),
    /presented term/);
});
