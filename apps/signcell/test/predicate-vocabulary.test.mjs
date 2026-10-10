import assert from "node:assert/strict";
import test from "node:test";
import { createPredicateVocabulary, findPredicateDefinition, listPredicateDefinitions } from "../src/predicate-vocabulary.mjs";

const parentOf = { name: "parent-of", description: "One concept generalizes another.", domain: "concept", range: "concept", category: "taxonomy", inverse: "child-of" };
const childOf = { name: "child-of", description: "One concept specializes another.", domain: "concept", range: "concept", category: "taxonomy", inverse: "parent-of" };
const cites = { name: "cites", description: "A document names a source.", domain: "document", range: "document", category: "reference" };

test("an admitted vocabulary is frozen, finds its definitions by name and lists them by category", () => {
  const admitted = createPredicateVocabulary([parentOf, childOf, cites]);
  assert.equal(admitted.ok, true);
  const vocabulary = admitted.value;
  assert.equal(vocabulary.kind, "sign.predicate-vocabulary");
  assert.equal(Object.isFrozen(vocabulary.definitions), true);
  assert.deepEqual(findPredicateDefinition(vocabulary, "cites"), cites);
  assert.equal(findPredicateDefinition(vocabulary, "absent"), null);
  assert.deepEqual(listPredicateDefinitions(vocabulary, { category: "taxonomy" }).map(({ name }) => name), ["parent-of", "child-of"]);
  assert.equal(listPredicateDefinitions(vocabulary).length, 3);
});

test("a vocabulary is refused for bad names, duplicates, missing text and unreciprocated inverses", () => {
  const refused = createPredicateVocabulary([
    { ...cites, name: "Cites" },
    cites,
    cites,
    { ...cites, name: "names", description: " " },
    { ...parentOf, inverse: "child-of" },
    { ...childOf, inverse: "sibling-of" },
  ]);
  assert.equal(refused.ok, false);
  assert.equal(refused.refusal.code, "invalid-predicate-vocabulary");
  assert.deepEqual(refused.refusal.issues, [
    "predicate name must be lowercase identifier text",
    "predicate name is duplicated: cites",
    "names.description must be non-empty text",
    "parent-of.inverse is not reciprocated by child-of",
    "child-of.inverse is not declared: sibling-of",
  ]);
  assert.throws(() => createPredicateVocabulary("cites"), TypeError);
  assert.throws(() => findPredicateDefinition({ kind: "other" }, "cites"), TypeError);
  assert.throws(() => listPredicateDefinitions(createPredicateVocabulary([cites]).value, { category: "" }), TypeError);
});
