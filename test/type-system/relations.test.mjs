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
