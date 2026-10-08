import assert from "node:assert/strict";
import test from "node:test";
import { admit, collectTypeSystem, createTypeSystem, defineType, getType, isSubtypeOf, specializeType, } from "../../src/type-system/type-system.mjs";
import { admitTypeSystemDocument, typeSystemDocument, } from "../../src/type-system/document.mjs";
import { admitRelationalFieldDocument, createRelationalField, defineRelation, relationalFieldDocument, } from "../../src/type-system/relations.mjs";
function value(result) {
    if (!result.ok)
        assert.fail(JSON.stringify(result.refusal));
    return result.value;
}
function catalog(accepted) {
    const address = value(defineType({ id: "Address", name: "Address", description: "An address.", parents: [], schema: { type: "string", minLength: 1 } }));
    const reference = { $id: "https://example.test/accepted", const: accepted };
    const observation = value(defineType({
        id: "Observation", name: "Observation", description: "A provider observation.", parents: [],
        schema: { type: "object", required: ["accepted"], properties: { accepted: { $ref: reference.$id } }, additionalProperties: false },
        references: [reference],
    }));
    const relation = value(defineRelation({ id: "observed", domain: address, codomain: observation, witness: address }));
    return { address, observation, relation, system: value(collectTypeSystem([address, observation])) };
}
test("catalog identity includes referenced definitions, including for empty replicas", () => {
    const positive = catalog(true), negative = catalog(false);
    const a = value(createRelationalField([positive.relation]));
    const b = value(createRelationalField([negative.relation]));
    assert.notEqual(a.catalogIdentity, b.catalogIdentity);
    const result = admitRelationalFieldDocument([negative.relation], relationalFieldDocument(a));
    assert.equal(result.ok, false);
    if (!result.ok)
        assert.equal(result.refusal.code, "catalog-mismatch");
});
test("a receiving runtime rebuilds shared parent references and identical value admission", () => {
    const { address, observation } = catalog(true);
    const longAddress = value(specializeType([address], { id: "LongAddress", name: "Long address", description: "At least two characters.", schema: { minLength: 2 } }));
    const original = value(collectTypeSystem([longAddress, observation]));
    const document = value(typeSystemDocument(original));
    const wire = JSON.parse(JSON.stringify(document));
    wire.types.reverse();
    const received = value(admitTypeSystemDocument(wire));
    assert.notEqual(getType(received, "Address"), address);
    assert.equal(isSubtypeOf(getType(received, "LongAddress"), getType(received, "Address")), true);
    for (const id of ["Address", "LongAddress", "Observation"]) {
        for (const input of ["a", "ab", 1, null, { accepted: true }, { accepted: false }]) {
            assert.deepEqual(admit(getType(received, id), input), admit(getType(original, id), input));
        }
    }
    assert.deepEqual(value(typeSystemDocument(received)), document);
    assert.equal(Object.isFrozen(document.types[0].parentIds), true);
});
test("reference registration order and catalog insertion order do not alter identity", () => {
    const references = [{ $id: "https://example.test/a", type: "string" }, { $id: "https://example.test/b", minLength: 2 }];
    const make = (refs) => value(defineType({ id: "Text", name: "Text", description: "Text.", parents: [], schema: { allOf: refs.map(r => ({ $ref: r.$id })).sort((a, b) => a.$ref.localeCompare(b.$ref)) }, references: refs }));
    const a = value(typeSystemDocument(value(collectTypeSystem([make(references)]))));
    const b = value(typeSystemDocument(value(collectTypeSystem([make([...references].reverse())]))));
    assert.equal(a.identity, b.identity);
    const { system } = catalog(true);
    assert.deepEqual(value(typeSystemDocument(system)), value(typeSystemDocument(value(createTypeSystem([...system.types].reverse())))));
});
test("changed schemas, missing references, cycles and duplicate type identities are refused", () => {
    const original = value(typeSystemDocument(catalog(true).system));
    const alter = (mutate) => {
        const document = JSON.parse(JSON.stringify(original));
        mutate(document);
        return admitTypeSystemDocument(document);
    };
    const changed = alter(d => { d.types.find((t) => t.id === "Observation").references[0].const = false; });
    assert.equal(changed.ok, false);
    if (!changed.ok)
        assert.equal(changed.refusal.kind, "type-system-identity-mismatch");
    assert.equal(alter(d => { d.types.find((t) => t.id === "Observation").references = []; }).ok, false);
    assert.equal(alter(d => { d.types[0].parentIds = ["missing"]; }).ok, false);
    assert.equal(alter(d => { d.types[0].parentIds = [d.types[1].id]; d.types[1].parentIds = [d.types[0].id]; }).ok, false);
    assert.equal(alter(d => { d.types.push(d.types[0]); }).ok, false);
    assert.equal(alter(d => { d.version = 2; }).ok, false);
    for (const input of [null, [], {}, { version: 1, identity: "fake", types: [] }])
        assert.equal(admitTypeSystemDocument(input).ok, false);
});
test("statements cross independently reconstructed catalogs with unchanged EAVT addresses", () => {
    const sender = catalog(true);
    const received = value(admitTypeSystemDocument(JSON.parse(JSON.stringify(value(typeSystemDocument(sender.system))))));
    const relation = value(defineRelation({ id: sender.relation.id, domain: getType(received, "Address"), codomain: getType(received, "Observation"), witness: getType(received, "Address") }));
    const field = value(createRelationalField([sender.relation], [{ subject: "attempt:1", predicate: "observed", object: { accepted: true }, witness: "receipt:1" }]));
    const replayed = value(admitRelationalFieldDocument([relation], JSON.parse(JSON.stringify(relationalFieldDocument(field)))));
    assert.equal(replayed.catalogIdentity, field.catalogIdentity);
    assert.deepEqual(replayed.statements, field.statements);
});
