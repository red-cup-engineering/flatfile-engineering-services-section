import test from "node:test";
import assert from "node:assert/strict";
import { readingTurtle, readingJsonLd, readingVocabulary, putReadingRdfGraph } from "../scripts/reading-rdf.mjs";

const base = "https://knowledge.example.test/";
const storeEndpoint = "https://rdf.example.test/data";
const graph = "urn:561:claims:lspace:v1";

function captured(status = 204) {
  const calls = [];
  return { calls, fetchImpl: async (url, options) => {
    calls.push({ url: new URL(url), options });
    return new Response(null, { status });
  } };
}

const folded = { entity: "task-17", fiber: [
  { predicate: "incumbent", object: "character-X", value: { evidence: [["source:frontmatter"], []] } },
  { predicate: "completed", object: true, value: { evidence: [["source:message"], ["source:receiver-denial"]] } },
  { predicate: "not-authorized", object: true, value: { evidence: [[], ["source:office-refusal"]] } },
  { predicate: "unobserved", object: "unknown", value: { evidence: [[], []] } },
] };

test("single native source-claim RDF projection cannot silently assert office authority or accepted work", () => {
  const ttl = readingTurtle(folded, { base });
  const json = readingJsonLd(folded, { base });
  assert.doesNotMatch(ttl, /^<[^>]+> <[^>]+> "character-X" \.$/mu);
  assert.doesNotMatch(ttl, /owl:NegativePropertyAssertion/u);
  assert.match(ttl, /rdf:object "character-X"/u);
  assert.match(ttl, /ws:AffirmedClaim/u);
  assert.match(ttl, /ws:OpposedClaim/u);
  assert.match(ttl, /ws:ContestedClaim/u);
  assert.match(ttl, /ws:claimedBy|prov:wasDerivedFrom/u);
  assert.match(ttl, /ws:contraryClaimedBy/u);
  assert.doesNotMatch(ttl, /unknown/u);
  assert.equal(Object.hasOwn(json["@graph"][0], "prop:incumbent"), false);
  assert.equal(json["@graph"].some(node => Array.isArray(node["@type"]) &&
    node["@type"].includes("ws:AffirmedClaim") && node["rdf:object"] === "character-X"), true);
  assert.equal(json["@graph"].some(node => Array.isArray(node["@type"]) &&
    node["@type"].includes("ws:OpposedClaim")), true);
  assert.equal(json["@graph"].some(node => node["@type"] === "ws:ContestedClaim"), true);
  assert.equal(json["@graph"].some(node => node["@type"] === "owl:NegativePropertyAssertion"), false);
  const ontology = readingVocabulary(base);
  for (const className of ["AffirmedClaim", "OpposedClaim", "ContestedClaim"]) {
    assert.match(ontology, new RegExp("ws:" + className + " a owl:Class"));
  }
  assert.match(ontology, /ws:contraryClaimedBy a owl:ObjectProperty ; rdfs:domain rdf:Statement/u);
});

test("retired claimOnly switch cannot restore fact-asserting RDF on any consuming surface", async () => {
  assert.throws(() => readingTurtle(folded, { base, claimOnly: false }), /claimOnly is retired/u);
  assert.throws(() => readingJsonLd(folded, { base, claimOnly: true }), /claimOnly is retired/u);
  const f = captured();
  await assert.rejects(() => putReadingRdfGraph({
    folded, base, graph, storeEndpoint, claimOnly: false, fetchImpl: f.fetchImpl,
  }), /claimOnly is retired/u);
  assert.equal(f.calls.length, 0);
});

test("a source-folded subject is sent as documentary Turtle on the owner-designated named graph", async () => {
  const f = captured();
  const expected = readingTurtle(folded, { base });
  const response = await putReadingRdfGraph({ folded, base, graph, storeEndpoint, fetchImpl: f.fetchImpl });
  assert.equal(response.status, 204);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].url.searchParams.get("graph"), graph);
  assert.equal(f.calls[0].options.method, "PUT");
  assert.equal(f.calls[0].options.headers.get("content-type"), "text/turtle");
  assert.equal(f.calls[0].options.body, expected);
  assert.doesNotMatch(expected, /owl:NegativePropertyAssertion/u);
  assert.doesNotMatch(expected, /^<[^>]+> <[^>]+> "character-X" \.$/mu);
});

test("unqualified source and missing graph scope refuse before remote RDF mutation", async () => {
  const f = captured();
  for (const props of [
    { folded, base: "/", graph, storeEndpoint },
    { folded, base, storeEndpoint },
    { folded: { entity: "task-17" }, base, graph, storeEndpoint },
    { folded: { entity: 4, fiber: [] }, base, graph, storeEndpoint },
  ]) {
    await assert.rejects(() => putReadingRdfGraph({ ...props, fetchImpl: f.fetchImpl }), TypeError);
  }
  assert.equal(f.calls.length, 0);
});

test("remote graph refusal never becomes a successful receipt", async () => {
  const f = captured(403);
  await assert.rejects(() => putReadingRdfGraph({
    folded, base, graph, storeEndpoint, fetchImpl: f.fetchImpl,
  }), error => error.name === "RdfServiceHttpError" && error.status === 403);
  assert.equal(f.calls.length, 1);
});
