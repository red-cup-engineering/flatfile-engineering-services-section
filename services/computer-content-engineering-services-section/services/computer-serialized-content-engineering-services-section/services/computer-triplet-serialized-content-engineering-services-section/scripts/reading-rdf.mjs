/**
 * reading-rdf — one subject's folded evidence (an EAVT fold: its entity and fiber of cells, each
 * with the witnesses told for and against it) as RDF, in Turtle or JSON-LD. A cell told only for
 * is a plain triple, reified with prov:wasDerivedFrom its witnesses; one told only against is an
 * owl:NegativePropertyAssertion; one told both ways is a ws:StableClaim carrying both sides'
 * witnesses. The ws: vocabulary names these classes.
 */
import { iriRef, predicateIri, predicateNamespace, subjectIri, turtleLiteral, vocabularyNamespace } from "@red-cup-engineering/turtle-services-section/turtle";

const NS = Object.freeze({
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  owl: "http://www.w3.org/2002/07/owl#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  prov: "http://www.w3.org/ns/prov#",
});

const isUrl = (value) => /^[a-z][a-z0-9+.-]*:\/\//iu.test(value);

function sides(cell) {
  const [forWitnesses = [], againstWitnesses = []] = cell.value?.evidence ?? [];
  return { for: forWitnesses.map(String), against: againstWitnesses.map(String) };
}

function objectTerm(base, object, subjects) {
  return typeof object === "string" && subjects.has(object) ? { iri: subjectIri(base, object) } : { literal: object };
}

function literalValue(value) {
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  return JSON.stringify(value) ?? String(value);
}

function turtleTerm(term) {
  return "iri" in term ? iriRef(term.iri) : turtleLiteral(literalValue(term.literal));
}

function provTurtle(witnesses) {
  return witnesses.length === 0 ? "[]" : witnesses.map((w) => isUrl(w) ? iriRef(w) : `[ a prov:Entity ; rdfs:label ${turtleLiteral(w)} ]`).join(", ");
}

function provJsonLd(witnesses) {
  const nodes = witnesses.map((w) => isUrl(w) ? { "@id": w } : { "@type": "prov:Entity", "rdfs:label": w });
  return nodes.length === 0 ? undefined : nodes.length === 1 ? nodes[0] : nodes;
}

function prefixes(base) {
  return [...Object.entries(NS).map(([name, iri]) => `@prefix ${name}: <${iri}> .`),
    `@prefix ws: <${vocabularyNamespace(base)}> .`, `@prefix prop: <${predicateNamespace(base)}> .`].join("\n");
}

/** A subject's folded evidence as Turtle. `subjects` are the other subjects whose names are IRIs here. */
export function readingTurtle(folded, opts = {}) {
  const base = opts.base ?? "/";
  const subjects = new Set(opts.subjects ?? []);
  const subject = iriRef(subjectIri(base, folded.entity));
  const out = [prefixes(base), "", `${subject} a ws:Subject ;`, `  rdfs:label ${turtleLiteral(folded.entity)} .`];
  for (const cell of folded.fiber) {
    const told = sides(cell);
    const predicate = iriRef(predicateIri(base, cell.predicate));
    const object = objectTerm(base, cell.object, subjects);
    if (told.for.length > 0 && told.against.length === 0) {
      out.push(`${subject} ${predicate} ${turtleTerm(object)} .`);
      out.push("[] a rdf:Statement, ws:PotentialClaim ;", `  rdf:subject ${subject} ; rdf:predicate ${predicate} ; rdf:object ${turtleTerm(object)} ;`, `  prov:wasDerivedFrom ${provTurtle(told.for)} .`);
    } else if (told.against.length > 0 && told.for.length === 0) {
      out.push("[] a owl:NegativePropertyAssertion ;", `  owl:sourceIndividual ${subject} ; owl:assertionProperty ${predicate} ;`,
        `  ${"iri" in object ? `owl:targetIndividual ${iriRef(object.iri)}` : `owl:targetValue ${turtleTerm(object)}`} ;`, `  prov:wasDerivedFrom ${provTurtle(told.against)} .`);
    } else if (told.for.length > 0) {
      out.push("[] a ws:StableClaim ;", `  rdf:subject ${subject} ; rdf:predicate ${predicate} ; rdf:object ${turtleTerm(object)} ;`,
        `  ws:claimedBy ${provTurtle(told.for)} ; ws:contraryClaimedBy ${provTurtle(told.against)} .`);
    }
  }
  return `${out.join("\n")}\n`;
}

/** A subject's folded evidence as a JSON-LD document. */
export function readingJsonLd(folded, opts = {}) {
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
    if (told.for.length > 0 && told.against.length === 0) {
      node[`prop:${cell.predicate}`] = jsonObject(object);
      graph.push({ "@type": ["rdf:Statement", "ws:PotentialClaim"], "rdf:subject": { "@id": id }, "rdf:predicate": predicate, "rdf:object": jsonObject(object), "prov:wasDerivedFrom": provJsonLd(told.for) });
    } else if (told.against.length > 0 && told.for.length === 0) {
      graph.push({ "@type": "owl:NegativePropertyAssertion", "owl:sourceIndividual": { "@id": id }, "owl:assertionProperty": predicate,
        ...("iri" in object ? { "owl:targetIndividual": { "@id": object.iri } } : { "owl:targetValue": object.literal }), "prov:wasDerivedFrom": provJsonLd(told.against) });
    } else if (told.for.length > 0) {
      graph.push({ "@type": "ws:StableClaim", "rdf:subject": { "@id": id }, "rdf:predicate": predicate, "rdf:object": jsonObject(object),
        "ws:claimedBy": provJsonLd(told.for), "ws:contraryClaimedBy": provJsonLd(told.against) });
    }
  }
  return { "@context": { ...NS, ws: vocabularyNamespace(base), prop: predicateNamespace(base), label: "rdfs:label" }, "@graph": graph };
}

/** The ws: vocabulary as Turtle: Subject, PotentialClaim, StableClaim, claimedBy and contraryClaimedBy. */
export function readingVocabulary(base = "/") {
  const vocab = vocabularyNamespace(base);
  return `${prefixes(base)}
<${vocab.slice(0, -1)}> a owl:Ontology ;
  rdfs:label "Readings vocabulary" ;
  rdfs:comment "Classes for subjects' claims as they are read from the evidence told for and against them." .

ws:Subject a owl:Class ; rdfs:label "Subject" ;
  rdfs:comment "A thing claims are told about; its name is its IRI." .

ws:PotentialClaim a owl:Class ; rdfs:subClassOf rdf:Statement ; rdfs:label "Potential claim" ;
  rdfs:comment "A claim told for and not against, with prov:wasDerivedFrom its witnesses." .

ws:StableClaim a owl:Class ; rdfs:subClassOf rdf:Statement ; rdfs:label "Stable claim" ;
  rdfs:comment "A claim told both for and against: a held contradiction." .

ws:claimedBy a owl:ObjectProperty ; rdfs:domain ws:StableClaim ; rdfs:range prov:Entity ; rdfs:subPropertyOf prov:wasDerivedFrom ; rdfs:label "claimed by" .

ws:contraryClaimedBy a owl:ObjectProperty ; rdfs:domain ws:StableClaim ; rdfs:range prov:Entity ; rdfs:subPropertyOf prov:wasDerivedFrom ; rdfs:label "contrary claimed by" .
`;
}
