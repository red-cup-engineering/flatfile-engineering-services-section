import test from "node:test";
import assert from "node:assert/strict";
import { readingTurtle, readingJsonLd, readingVocabulary, readingClaimId, putReadingRdfGraph } from "../scripts/reading-rdf.mjs";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";

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

test("source-local SCA addresses stable claim positions through Turtle, JSON-LD and independent witnesses", () => {
  const position = { predicate: "incumbent", object: "character-X" };
  const expected = semanticId({ kind: "rdf.documentary-claim-position",
    subject: "source@revision-A", ...position });
  assert.equal(readingClaimId("source@revision-A", position), expected);
  assert.match(expected, /^ni:\/\/\/sha-256;/u);
  assert.notEqual(readingClaimId("source@revision-B", position), expected,
    "identical tokens under a different source revision must be addressably distinct");
  assert.notEqual(readingClaimId("source@revision-A", { ...position, object: "character-Y" }), expected);

  const first = { entity: "source@revision-A", fiber: [
    { ...position, value: { evidence: [["source-witness-A"], []] } },
  ] };
  const opposed = { entity: first.entity, fiber: [
    { ...position, value: { evidence: [["source-witness-A"], ["office-counter-witness"]] } },
  ] };
  const ttl = readingTurtle(first, {base});
  const contested = readingTurtle(opposed, {base});
  const json = readingJsonLd(first, {base});
  const contestedJson = readingJsonLd(opposed, {base});
  assert.ok(ttl.includes(`<${expected}> a rdf:Statement, ws:AffirmedClaim ;`));
  assert.ok(contested.includes(`<${expected}> a ws:ContestedClaim ;`));
  assert.equal(json["@graph"][1]["@id"], expected);
  assert.equal(contestedJson["@graph"][1]["@id"], expected);
  assert.deepEqual(json["@graph"][1]["prov:wasDerivedFrom"]["rdfs:label"], "source-witness-A");
  assert.equal(contestedJson["@graph"][1]["ws:contraryClaimedBy"]["rdfs:label"], "office-counter-witness");
  assert.doesNotMatch(ttl, /<https:\/\/knowledge\.example\.test\/source%40revision-A> <[^>]+> "character-X"/u);
  assert.deepEqual(first.fiber[0].value.evidence, [["source-witness-A"], []],
    "a read does not mutate the existing signed witnesses");
});

test("source-local claim positions cannot be minted from malformed subject, predicate or missing value", () => {
  for (const [entity, cell] of [
    ["", {predicate:"incumbent",object:"X"}],
    ["source", {object:"X"}],
    ["source", {predicate:"",object:"X"}],
    ["source", {predicate:"incumbent"}],
    ["source", null],
  ]) assert.throws(() => readingClaimId(entity, cell), /addressed documentary claim/u);
});
