import assert from "node:assert/strict";
import test from "node:test";
import { admitDescription } from "../src/description.mjs";

function description(overrides = {}) {
  return {
    type: "Description",
    version: 1,
    subject: { kind: "operation" },
    consumer: { kind: "catalog", decision: "select an operation" },
    text: "Converts one admitted source record into a normalized result.",
    predicates: [{ claim: "converts an admitted source record", grounds: ["operation-contract:input-output"], separatesFrom: ["other operations"] }],
    neighbors: [{ kind: "operation", contrast: "other operations" }],
    ...overrides,
  };
}

test("admits grounded consumer-relative description semantics", () => {
  const admitted = admitDescription(description());
  assert.equal(admitted.text, "Converts one admitted source record into a normalized result.");
  assert(Object.isFrozen(admitted));
});

test("keeps subject identity outside the description contract", () => {
  assert.throws(() => admitDescription(description({ subject: { kind: "operation", identifier: "convert-thing" } })), /subject must carry exactly/u);
});

test("requires a named consumer decision", () => {
  assert.throws(() => admitDescription(description({ consumer: { kind: "catalog", decision: " " } })), /consumer decision/u);
});

test("requires every predicate to carry grounding", () => {
  assert.throws(() => admitDescription(description({ predicates: [{ claim: "converts things", grounds: [], separatesFrom: ["other operations"] }] })), /grounded/u);
});

test("requires separation from relevant same-typed neighbors", () => {
  assert.throws(() => admitDescription(description({ predicates: [{ claim: "converts things", grounds: ["contract"], separatesFrom: [] }] })), /separating/u);
  assert.throws(() => admitDescription(description({ neighbors: [{ kind: "artifact", contrast: "other operations" }] })), /subject's kind/u);
});

test("keeps carrier kind and consumer style parameters explicit", () => {
  assert.throws(() => admitDescription({ ...description(), type: "Definition" }), /Description@1/u);
  assert.throws(() => admitDescription(description(), { maximumSentences: 0 }), /more sentences/u);
  assert.equal(admitDescription(description(), { maximumCharacters: 100, registerPattern: /^Converts/u }).type, "Description");
});
