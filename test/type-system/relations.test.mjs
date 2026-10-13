import assert from "node:assert/strict";
import test from "node:test";
import { defineType, specializeType } from "../../src/type-system/type-system.mjs";
import { admitRelationalFieldDocument, admitStatement, createRelationalField, defineRelation, mergeRelationalFields, queryRelationalField, relationalFieldDocument } from "../../src/type-system/relations.mjs";
import { encodeCanonical } from "@red-cup-engineering/cbor-services-section";
import { canonicalCborToNiUri } from "@red-cup-engineering/cbor-services-section";
function value(result) {
    assert.equal(result.ok, true, JSON.stringify(result));
    if (!result.ok)
        throw new Error(JSON.stringify(result.refusal));
    return result.value;
}
const address = value(defineType({ id: "Address", name: "Address", description: "An explicit identity.", parents: [], schema: { type: "string", minLength: 1 } }));
const evidence = value(defineType({ id: "Evidence", name: "Evidence", description: "An observed value.", parents: [], schema: { type: "object", required: ["accepted"], properties: { accepted: { type: "boolean" } }, additionalProperties: false } }));
const observed = value(defineRelation({ id: "observed", domain: address, codomain: evidence, witness: address }));
const positive = { subject: "attempt:1", predicate: "observed", object: { accepted: true }, witness: "receipt:1" };
const negative = { ...positive, object: { accepted: false }, witness: "receipt:2" };
test("a predicate checks all three declared positions and inherited constraints", () => {
    const longAddress = value(specializeType([address], { id: "LongAddress", name: "Long address", description: "At least two characters.", schema: { minLength: 2 } }));
    const relation = value(defineRelation({ id: "references", domain: longAddress, codomain: address, witness: address }));
    assert.equal(admitStatement(relation, { subject: "a", predicate: "references", object: "b", witness: "w" }).ok, false);
    assert.equal(admitStatement(observed, { ...positive, object: { accepted: "yes" } }).ok, false);
    assert.equal(admitStatement(observed, { ...positive, witness: null }).ok, false);
    assert.equal(admitStatement(observed, { ...positive, predicate: "invented" }).ok, false);
    assert.equal(admitStatement(observed, { ...positive, extra: true }).ok, false);
});
test("statement addresses preserve existing EAVT content identity and isolate mutable inputs", () => {
    const input = structuredClone(positive);
    const result = value(admitStatement(observed, input));
    assert.equal(result.id, canonicalCborToNiUri(encodeCanonical({ e: positive.subject, a: positive.predicate, v: positive.object, t: positive.witness })));
    input.object.accepted = false;
    assert.deepEqual(result.statement.object, { accepted: true });
    assert.equal(Object.isFrozen(result.statement.object), true);
    assert.equal(Object.isFrozen(input.object), false);
});
test("replica union is commutative, associative, idempotent and retains disagreement", () => {
    const a = value(createRelationalField([observed], [positive]));
    const b = value(createRelationalField([observed], [negative]));
    const c = value(createRelationalField([observed], [{ ...positive, witness: "receipt:3" }]));
    const merge = (...fields) => value(mergeRelationalFields([observed], ...fields));
    assert.deepEqual(merge(a, b), merge(b, a));
    assert.deepEqual(merge(merge(a, b), c), merge(a, merge(b, c)));
    assert.deepEqual(merge(a, a), a);
    const claims = queryRelationalField(merge(a, b), "observed");
    assert.equal(claims.length, 2);
    assert.deepEqual(new Set(claims.map(item => item.statement.object.accepted)), new Set([true, false]));
    assert.equal(createRelationalField([observed], [{ ...positive, predicate: "unknown" }]).ok, false);
});
test("nonportable values and unestablished predicate declarations are refused", () => {
    assert.equal(admitStatement({ ...observed }, positive).ok, false);
    assert.equal(admitStatement(observed, { ...positive, witness: undefined }).ok, false);
    const cyclic = {};
    cyclic.self = cyclic;
    assert.equal(admitStatement(observed, { ...positive, object: cyclic }).ok, false);
});
test("wire admission verifies declaration identity and content rather than trusting remote labels", () => {
    const field = value(createRelationalField([observed], [positive, negative]));
    const wire = JSON.parse(JSON.stringify(relationalFieldDocument(field)));
    assert.deepEqual(value(admitRelationalFieldDocument([observed], wire)), field);
    wire.statements[0].statement.witness = "tampered";
    const tampered = admitRelationalFieldDocument([observed], wire);
    assert.equal(tampered.ok, false);
    if (!tampered.ok)
        assert.equal(tampered.refusal.code, "statement-identity-mismatch");
    const narrow = value(defineType({ id: "Evidence", name: "Evidence", description: "Different meaning under the same name.", parents: [], schema: { type: "object", properties: { accepted: { const: true } }, required: ["accepted"] } }));
    const changed = value(defineRelation({ id: "observed", domain: address, codomain: narrow, witness: address }));
    const drift = admitRelationalFieldDocument([changed], relationalFieldDocument(field));
    assert.equal(drift.ok, false);
    if (!drift.ok)
        assert.equal(drift.refusal.code, "catalog-mismatch");
});

test("opaque statement patterns navigate every position and retain conflicting witnesses", () => {
    const field = value(createRelationalField([observed], [positive, negative, { ...positive, subject: "attempt:2", witness: "receipt:3" }]));
    assert.deepEqual(queryRelationalField(field, "observed"), queryRelationalField(field, { predicate: "observed" }));
    assert.deepEqual(queryRelationalField(field, {}), field.statements);
    const about = queryRelationalField(field, { subject: "attempt:1" });
    assert.equal(about.length, 2);
    assert.deepEqual(new Set(about.map(item => item.statement.object.accepted)), new Set([true, false]));
    assert.deepEqual(queryRelationalField(field, { subject: "attempt:1", object: { accepted: true } }).map(item => item.statement), [positive]);
    assert.deepEqual(queryRelationalField(field, { witness: "receipt:2" }).map(item => item.statement), [negative]);
    assert.deepEqual(queryRelationalField(field, { subject: "attempt:1", witness: "receipt:3" }), []);
    assert.deepEqual(queryRelationalField(field, { predicate: "missing" }), []);
    assert.equal(Object.isFrozen(about), true);
    assert.equal(about[0], field.statements.find(item => item.id === about[0].id));
    assert.deepEqual(about.map(item => item.id), [...about.map(item => item.id)].sort());
});

test("queries use shared SCA coincidence without collapsing EAVT statements or relation declarations", () => {
    const opaque = value(defineType({ id: "OpaqueQueryMark", name: "Opaque query mark", description: "A present uninterpreted JSON datum.", parents: [], schema: {} }));
    const decomposed = "ta\u0302che", composed = "tâche";
    const relation = value(defineRelation({ id: decomposed, domain: opaque, codomain: opaque, witness: opaque }));
    const other = value(defineRelation({ id: composed, domain: opaque, codomain: opaque, witness: opaque }));
    const left = { subject: { token: decomposed, coordinate: 0 }, predicate: decomposed, object: null, witness: { claim: decomposed } };
    const right = { subject: { coordinate: 0, token: composed }, predicate: decomposed, object: null, witness: { claim: composed } };
    const third = { ...right, predicate: composed, object: false };
    const field = value(createRelationalField([relation, other], [left, right, third]));
    const about = queryRelationalField(field, { subject: { token: composed, coordinate: -0 }, object: null });
    assert.equal(about.length, 2, "both canonically coincident raw EAVT statements remain available");
    assert.notEqual(about[0].id, about[1].id, "existing raw-CBOR EAVT identities are unchanged");
    assert.equal(queryRelationalField(field, { witness: { claim: composed } }).length, 3);
    assert.equal(queryRelationalField(field, decomposed).length, 2, "declared relation names remain exact");
    assert.equal(queryRelationalField(field, composed).length, 1);
    assert.equal(queryRelationalField(field, { object: false }).length, 1);
});

test("query refusals distinguish absent positions from present null and reject unsupported patterns", () => {
    const field = value(createRelationalField([observed], [positive]));
    const cycle = {}; cycle.self = cycle;
    for (const pattern of [undefined, null, [], { subject: undefined }, { entity: "attempt:1" }, { predicate: null }, { object: cycle }, { witness: NaN }, { subject: new Date() }])
        assert.throws(() => queryRelationalField(field, pattern), TypeError);
    assert.deepEqual(queryRelationalField(field, { object: null }), []);
    assert.deepEqual(queryRelationalField(field, ""), []);
});

test("foreign field presentations cannot retain a stale index after caller mutation", () => {
    const field = value(createRelationalField([observed], [positive, negative]));
    const foreign = structuredClone(field);
    assert.equal(queryRelationalField(foreign, { subject: "attempt:1" }).length, 2);
    foreign.statements[0].statement.subject = "attempt:changed";
    assert.equal(queryRelationalField(foreign, { subject: "attempt:1" }).length, 1);
    assert.equal(queryRelationalField(foreign, { subject: "attempt:changed" }).length, 1);
    foreign.statements[0].id = foreign.statements[1].id;
    assert.deepEqual(queryRelationalField(foreign, { subject: "attempt:changed", witness: foreign.statements[1].statement.witness }), [], "a caller's coincident advertised ids cannot create a pattern match");
});

