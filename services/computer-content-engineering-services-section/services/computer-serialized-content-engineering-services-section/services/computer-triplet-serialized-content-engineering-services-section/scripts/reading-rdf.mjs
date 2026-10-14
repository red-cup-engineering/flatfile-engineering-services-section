/**
 * reading-rdf — one subject's folded evidence (an EAVT fold: its entity and fiber of cells, each
 * with the witnesses told for and against it) as RDF, in Turtle or JSON-LD. A cell told only for
 * is an affirmed claim, one told only against is an opposed claim, and a cell
 * told both ways is contested. Each is an RDF-reified documentary statement,
 * not an assertion of the underlying property, an OWL negative fact, an
 * authorization or an independently accepted effect.
 */
import { iriRef, predicateIri, predicateNamespace, subjectIri, turtleLiteral, vocabularyNamespace } from "@red-cup-engineering/turtle-services-section/turtle";
import { graphStoreProtocol } from "./sparql-http-client.mjs";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";

const NS = Object.freeze({
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  owl: "http://www.w3.org/2002/07/owl#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  prov: "http://www.w3.org/ns/prov#",
});

/** Explicitly admitted witness-address syntaxes; text labels are not inferred to be IRIs. */
function isWitnessIri(value) {
  if (/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u.test(value)) return true;
  if (/^urn:[A-Za-z0-9][A-Za-z0-9:._~-]*$/u.test(value)) return true;
  return /^https?:\/\//u.test(value) && !/[\s<>"{}|^\\]/u.test(value);
}

/** Preserve the two independent evidence families, refusing untyped witnesses. */
function sides(cell) {
  const evidence = cell.value?.evidence ?? [[], []];
  if (!Array.isArray(evidence) || evidence.length !== 2 ||
      evidence.some(witnesses => !Array.isArray(witnesses) ||
        witnesses.some(witness => typeof witness !== "string" || witness.trim() === ""))) {
    throw new TypeError("RDF documentary evidence needs two arrays of nonempty witness identities");
  }
  return { for: [...new Set(evidence[0])].sort(),
    against: [...new Set(evidence[1])].sort() };
}

/** One evidence-independent, source-local typed claim position (not a proof or grant). */
export function readingClaimId(entity, cell, {base = "/", subjects = []} = {}) {
  if (typeof entity !== "string" || entity.trim() === "" || !cell ||
      typeof cell.predicate !== "string" || cell.predicate.trim() === "" || !Object.hasOwn(cell, "object")) {
    throw new TypeError("an addressed documentary claim requires a source subject, predicate, and object");
  }
  const membership = new Set(subjects);
  return semanticId({ kind: "rdf.documentary-claim-position",
    subject: subjectIri(base, entity), predicate: predicateIri(base, cell.predicate),
    object: objectTerm(base, cell.object, membership) });
}

function objectTerm(base, object, subjects) {
  if (typeof object === "string" && subjects.has(object)) return { iri: subjectIri(base, object) };
  if (typeof object !== "string" && typeof object !== "boolean" &&
      !(typeof object === "number" && Number.isFinite(object))) {
    throw new TypeError("RDF object must be an admitted scalar or an explicitly referenced subject");
  }
  return { literal: object };
}

function literalValue(value) {
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  throw new TypeError("complex RDF values require a separately admitted addressed term");
}

function turtleTerm(term) {
  return "iri" in term ? iriRef(term.iri) : turtleLiteral(literalValue(term.literal));
}

function provTurtle(witnesses) {
  return witnesses.length === 0 ? "[]" : witnesses.map((w) => isWitnessIri(w) ? iriRef(w) : `[ a prov:Entity ; rdfs:label ${turtleLiteral(w)} ]`).join(", ");
}

function provJsonLd(witnesses) {
  const nodes = witnesses.map((w) => isWitnessIri(w) ? { "@id": w } : { "@type": "prov:Entity", "rdfs:label": w });
  return nodes.length === 0 ? undefined : nodes.length === 1 ? nodes[0] : nodes;
}

function prefixes(base) {
  return [...Object.entries(NS).map(([name, iri]) => `@prefix ${name}: <${iri}> .`),
    `@prefix ws: <${vocabularyNamespace(base)}> .`, `@prefix prop: <${predicateNamespace(base)}> .`].join("\n");
}

/** A subject's source testimony as Turtle. Never promotes it to domain facts.
 * `subjects` names typed IRI references; evidence remains documentary. */
export function readingTurtle(folded, opts = {}) {
  if (Object.hasOwn(opts, "claimOnly")) {
    throw new TypeError("claimOnly is retired; the source reading never asserts domain facts");
  }
  const base = opts.base ?? "/";
  const subjects = new Set(opts.subjects ?? []);
  const subject = iriRef(subjectIri(base, folded.entity));
  const out = [prefixes(base), "", `${subject} a ws:Subject ;`, `  rdfs:label ${turtleLiteral(folded.entity)} .`];
  for (const cell of folded.fiber) {
    const told = sides(cell);
    const predicate = iriRef(predicateIri(base, cell.predicate));
    const object = objectTerm(base, cell.object, subjects);
    const claim = iriRef(readingClaimId(folded.entity, cell, {base, subjects}));
    if (told.for.length > 0 && told.against.length === 0) {
      out.push(`${claim} a rdf:Statement, ws:AffirmedClaim ;`, `  rdf:subject ${subject} ; rdf:predicate ${predicate} ; rdf:object ${turtleTerm(object)} ;`, `  prov:wasDerivedFrom ${provTurtle(told.for)} .`);
    } else if (told.against.length > 0 && told.for.length === 0) {
      out.push(`${claim} a rdf:Statement, ws:OpposedClaim ;`,
        `  rdf:subject ${subject} ; rdf:predicate ${predicate} ; rdf:object ${turtleTerm(object)} ;`,
        `  ws:contraryClaimedBy ${provTurtle(told.against)} .`);
    } else if (told.for.length > 0) {
      out.push(`${claim} a rdf:Statement, ws:ContestedClaim ;`, `  rdf:subject ${subject} ; rdf:predicate ${predicate} ; rdf:object ${turtleTerm(object)} ;`,
        `  ws:claimedBy ${provTurtle(told.for)} ; ws:contraryClaimedBy ${provTurtle(told.against)} .`);
    }
  }
  return `${out.join("\n")}\n`;
}

/** A subject's source testimony as JSON-LD; no naked positive/negative facts. */
export function readingJsonLd(folded, opts = {}) {
  if (Object.hasOwn(opts, "claimOnly")) {
    throw new TypeError("claimOnly is retired; the source reading never asserts domain facts");
  }
  const base = opts.base ?? "/";
  const subjects = new Set(opts.subjects ?? []);
  const id = subjectIri(base, folded.entity);
  const node = { "@id": id, "@type": "ws:Subject", label: folded.entity };
  const graph = [node];
  const jsonObject = (term) => "iri" in term ? { "@id": term.iri } : term.literal;
  for (const cell of folded.fiber) {
    const told = sides(cell);
    const predicate = { "@id": predicateIri(base, cell.predicate) };
    const object = objectTerm(base, cell.object, subjects);
    const claim = readingClaimId(folded.entity, cell, {base, subjects});
    if (told.for.length > 0 && told.against.length === 0) {
      graph.push({ "@id": claim, "@type": ["rdf:Statement", "ws:AffirmedClaim"], "rdf:subject": { "@id": id }, "rdf:predicate": predicate, "rdf:object": jsonObject(object), "prov:wasDerivedFrom": provJsonLd(told.for) });
    } else if (told.against.length > 0 && told.for.length === 0) {
      graph.push({ "@id": claim, "@type": ["rdf:Statement", "ws:OpposedClaim"], "rdf:subject": { "@id": id },
        "rdf:predicate": predicate, "rdf:object": jsonObject(object),
        "ws:contraryClaimedBy": provJsonLd(told.against) });
    } else if (told.for.length > 0) {
      graph.push({ "@id": claim, "@type": ["rdf:Statement", "ws:ContestedClaim"], "rdf:subject": { "@id": id }, "rdf:predicate": predicate, "rdf:object": jsonObject(object),
        "ws:claimedBy": provJsonLd(told.for), "ws:contraryClaimedBy": provJsonLd(told.against) });
    }
  }
  return { "@context": { ...NS, ws: vocabularyNamespace(base), prop: predicateNamespace(base), label: "rdfs:label" }, "@graph": graph };
}

/** The ws: vocabulary as Turtle: Subject, AffirmedClaim, OpposedClaim, ContestedClaim and evidence properties. */
export function readingVocabulary(base = "/") {
  const vocab = vocabularyNamespace(base);
  return `${prefixes(base)}
<${vocab.slice(0, -1)}> a owl:Ontology ;
  rdfs:label "Readings vocabulary" ;
  rdfs:comment "Classes for subjects' claims as they are read from the evidence told for and against them." .

ws:Subject a owl:Class ; rdfs:label "Subject" ;
  rdfs:comment "A thing claims are told about; its name is its IRI." .

ws:AffirmedClaim a owl:Class ; rdfs:subClassOf rdf:Statement ; rdfs:label "Affirmed claim" ;
  rdfs:comment "Evidence reported for the named relation; not an independently verified RDF domain fact." .

ws:ContestedClaim a owl:Class ; rdfs:subClassOf rdf:Statement ; rdfs:label "Contested claim" ;
  rdfs:comment "Both affirmative and opposing documentary testimony are present; no explosion into domain entailments." .

ws:OpposedClaim a owl:Class ; rdfs:subClassOf rdf:Statement ; rdfs:label "Opposed claim" ;
  rdfs:comment "Documentary opposition to the named relation, not an OWL negative property assertion." .

ws:claimedBy a owl:ObjectProperty ; rdfs:domain rdf:Statement ; rdfs:range prov:Entity ; rdfs:subPropertyOf prov:wasDerivedFrom ; rdfs:label "claimed by" .

ws:contraryClaimedBy a owl:ObjectProperty ; rdfs:domain rdf:Statement ; rdfs:range prov:Entity ; rdfs:subPropertyOf prov:wasDerivedFrom ; rdfs:label "contrary claimed by" .
`;
}

/**
 * Publish one already-qualified folded subject reading as a named RDF graph
 * through the W3C Graph Store HTTP Protocol. This reuses readingTurtle and
 * the shared SPARQL HTTP transport. Caller owns the source, graph IRI,
 * authorization and receiver; neither projection nor HTTP 2xx proves truth.
 * PUT *replaces* that named graph; caller must use an identity it owns.
 * This operation publishes documentary source claims only. Its caller is
 * responsible for graph ownership and authorization. Facts with independent
 * authority require the real receiving provider, not a boolean toggle.
 */
export async function putReadingRdfGraph(options = {}) {
  if (Object.hasOwn(options, "claimOnly")) {
    throw new TypeError("claimOnly is retired; the source reading never asserts domain facts");
  }
  const { folded, base, subjects = [], graph, storeEndpoint, fetchImpl, headers } = options;
  if (typeof base !== "string" || !base.startsWith("https://")) {
    throw new TypeError("RDF reading base must be an absolute HTTPS namespace");
  }
  if (!folded || typeof folded.entity !== "string" || !Array.isArray(folded.fiber)) {
    throw new TypeError("RDF reading requires an admitted subject and evidence fiber");
  }
  if (typeof graph !== "string" || !graph) {
    throw new TypeError("RDF export needs a named graph assigned by the receiving owner");
  }
  const body = readingTurtle(folded, {base,subjects});
  return graphStoreProtocol(storeEndpoint,{
    graph, method:"PUT", body, contentType:"text/turtle", fetchImpl, headers,
  });
}
