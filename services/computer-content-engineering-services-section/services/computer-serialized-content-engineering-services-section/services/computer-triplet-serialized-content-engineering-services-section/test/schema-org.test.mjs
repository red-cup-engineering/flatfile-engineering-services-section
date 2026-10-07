import assert from "node:assert/strict";
import test from "node:test";
import { definedTermJsonLd, definedTermSetJsonLd } from "../scripts/schema-org.mjs";

test("definedTermJsonLd names concepts by IRI and keeps a short description apart from the definition", () => {
  const node = definedTermJsonLd({
    id: "https://example.org/k/mechanics/force", name: "Force", aliases: ["push"], codes: ["force"],
    description: "An interaction that changes motion.", definition: "A force is an interaction that, when unopposed, changes the motion of an object.",
    set: "https://example.org/k/mechanics", broader: ["https://example.org/k/mechanics/interaction"], related: [],
  });
  assert.deepEqual(node["@type"], ["DefinedTerm", "skos:Concept"]);
  assert.equal(node["@id"], "https://example.org/k/mechanics/force");
  assert.equal(node.url, undefined);
  assert.equal(node.description, "An interaction that changes motion.");
  assert.equal(node["skos:notation"], "force");
  assert.deepEqual(node["skos:inScheme"], { "@id": "https://example.org/k/mechanics" });
  assert.deepEqual(node["skos:broader"], { "@id": "https://example.org/k/mechanics/interaction" });
  assert.equal("skos:related" in node, false);
  assert.equal(definedTermJsonLd({ url: "https://example.org/p", name: "P", definition: "D" }).description, "D");
});

test("definedTermSetJsonLd is a DefinedTermSet and a SKOS concept scheme", () => {
  const node = definedTermSetJsonLd({ id: "https://example.org/k/mechanics", name: "Mechanics glossary", codes: ["mechanics"] });
  assert.deepEqual(node["@type"], ["DefinedTermSet", "skos:ConceptScheme"]);
  assert.equal(node["skos:prefLabel"], "Mechanics glossary");
});
