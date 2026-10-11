import assert from "node:assert/strict";
import test from "node:test";
import { defineType, typeIdentity } from "../../src/type-system/type-system.mjs";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { makeThing } from "../../src/type-system/thing.mjs";
const admitted = (result) => {
    assert.equal(result.ok, true, result.ok ? undefined : result.refusal?.message);
    return result.value;
};
const application = admitted(defineType({
    id: "application", name: "Application", description: "An executable application.", parents: [],
    schema: { type: "object", properties: { name: { type: "string" }, configuration: { type: "object" } }, required: ["name", "configuration"] },
}));
const resource = admitted(defineType({
    id: "resource", name: "Resource", description: "A readable resource.", parents: [],
    schema: { type: "object", properties: { name: { type: "string" }, path: { type: "string" } }, required: ["name", "path"] },
}));
const actor = admitted(defineType({
    id: "actor", name: "Actor", description: "An addressable actor.", parents: [],
    schema: { type: "object", properties: { name: { type: "string" }, path: { type: "string" } }, required: ["name", "path"] },
}));
const created = (input) => {
    const result = makeThing(input);
    assert.equal(result.ok, true, result.ok ? undefined : "Thing creation was refused");
    return result.value;
};
test("makeThing derives a stable identity and isolates caller data", () => {
    const attributes = { name: "MUD", configuration: { ports: [4000] } };
    const thing = created({ type: application, attributes });
    assert.equal(thing.type, typeIdentity(application));
    assert.equal(thing.id, semanticId({ type: typeIdentity(application), attributes }));
    assert.equal(Object.isFrozen(thing), true);
    assert.equal(Object.isFrozen(thing.attributes), true);
    assert.equal(Object.isFrozen(thing.attributes.configuration), true);
    attributes.configuration.ports[0] = 5000;
    assert.deepEqual(thing.attributes, { name: "MUD", configuration: { ports: [4000] } });
});
test("equal typed JSON makes the same Thing identity independent of object insertion order", () => {
    const first = created({ type: resource, attributes: { name: "Thing", path: "/ontology/thing" } });
    const second = created({ type: resource, attributes: { path: "/ontology/thing", name: "Thing" } });
    const otherType = created({ type: actor, attributes: { name: "Thing", path: "/ontology/thing" } });
    assert.equal(first.id, second.id);
    assert.notEqual(first.id, otherType.id);
});
test("makeThing refuses unestablished types, unadmitted values, and non-portable input", () => {
    assert.equal(makeThing({ type: {}, attributes: { name: "Thing", path: "/thing" } }).ok, false);
    assert.equal(makeThing({ type: resource, attributes: { name: "Thing" } }).ok, false);
    assert.equal(makeThing({ type: resource, attributes: { name: "Thing", path: "/thing", count: Number.NaN } }).ok, false);
    assert.equal(makeThing({ type: resource, attributes: { name: "Thing", path: "/thing", when: new Date() } }).ok, false);
    const cyclic = {};
    cyclic.self = cyclic;
    assert.equal(makeThing({ type: resource, attributes: cyclic }).ok, false);
    const accessor = Object.defineProperty({ name: "Thing", path: "/thing" }, "path", { enumerable: true, get: () => "/changed" });
    assert.equal(makeThing({ type: resource, attributes: accessor }).ok, false);
});
