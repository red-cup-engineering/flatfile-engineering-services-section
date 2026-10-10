/**
 * codecs/text/json/json-ld — the JSON-LD document codec over admitted Triples.
 *
 * Triples sharing a subject fold into one JSON-LD node `{"@id", "prop:<predicate>": value}`;
 * an object equal to another subject in the same graph becomes an `{"@id"}` reference,
 * an absolute-IRI-shaped string object stays an `{"@id"}` reference verbatim, everything
 * else is kept as its own JSON literal. `tripleGraphToJsonLd`/`jsonLdToTripleGraph`
 * round-trip under the same `base`: subject/predicate identity recovers as the address's
 * decoded string (JSON-LD carries no non-string node/predicate identity), object values
 * recover with their original JSON type. `jsonLdToTripleGraph` rejects any document outside
 * this codec's normal form (missing `@context.prop`, non-array `@graph`, a node without a
 * string `@id`, or a key outside the `prop:` predicate namespace) rather than guessing.
 */
import { iriRef, isIriTerm, predicateNamespace, subjectIri, vocabularyNamespace } from "@red-cup-engineering/turtle-services-section/turtle";

import { assertTriple } from "@red-cup-engineering/eavt-services-section/triple";

export { iriRef };

function ensureSlash(base) {
  return base.endsWith("/") ? base : `${base}/`;
}

function predicateKey(predicate) {
  if (typeof predicate !== "string" && typeof predicate !== "number") {
    throw new TypeError(`json-ld: triple.p must be a string or number to key a JSON-LD node, got ${typeof predicate}`);
  }
  return `prop:${predicate}`;
}

function objectTerm(base, value, subjects) {
  if (typeof value === "string" && subjects.has(value)) return Object.freeze({ "@id": subjectIri(base, value) });
  if (isIriTerm(value)) return Object.freeze({ "@id": value });
  return value;
}

/** Project admitted Triples into one JSON-LD `@graph` document, grouped by subject. */
export function tripleGraphToJsonLd(triples, opts = {}) {
  const base = opts.base ?? "/";
  const admitted = triples.map((value) => assertTriple(value));
  const subjects = new Set(admitted.map((triple) => String(triple.s)));
  const nodes = new Map();
  const order = [];

  for (const triple of admitted) {
    const id = subjectIri(base, triple.s);
    let node = nodes.get(id);
    if (node === undefined) {
      node = { "@id": id };
      nodes.set(id, node);
      order.push(id);
    }
    const key = predicateKey(triple.p);
    const term = objectTerm(base, triple.o, subjects);
    const existing = node[key];
    node[key] = existing === undefined
      ? term
      : Object.freeze([...(Array.isArray(existing) ? existing : [existing]), term]);
  }

  return Object.freeze({
    "@context": Object.freeze({ vocab: vocabularyNamespace(base), prop: predicateNamespace(base) }),
    "@graph": Object.freeze(order.map((id) => Object.freeze(nodes.get(id)))),
  });
}

function subjectFromIri(base, iri) {
  const prefix = ensureSlash(base);
  if (!iri.startsWith(prefix)) throw new TypeError(`json-ld: @id ${iri} is not addressed under base ${base}`);
  return decodeURIComponent(iri.slice(prefix.length));
}

function objectFromJsonLd(base, value) {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const keys = Object.keys(value);
    const id = (value)["@id"];
    if (keys.length === 1 && typeof id === "string") {
      return id.startsWith(ensureSlash(base)) ? subjectFromIri(base, id) : id;
    }
  }
  return value;
}

/** Parse a JSON-LD document in this codec's committed triple-graph normal form. */
export function jsonLdToTripleGraph(document, opts = {}) {
  const base = opts.base ?? "/";
  if (document === null || typeof document !== "object" || Array.isArray(document)) {
    throw new TypeError("json-ld: document must be a JSON object");
  }
  const record = document;
  const context = record["@context"];
  if (context === null || typeof context !== "object" || typeof (context)["prop"] !== "string") {
    throw new TypeError("json-ld: document is not a member of this codec's triple-graph normal form (missing @context.prop)");
  }
  const graph = record["@graph"];
  if (!Array.isArray(graph)) throw new TypeError("json-ld: document must have an array @graph");

  const triples = [];
  for (const node of graph) {
    if (node === null || typeof node !== "object" || Array.isArray(node)) {
      throw new TypeError("json-ld: @graph member must be an object");
    }
    const nodeRecord = node;
    const id = nodeRecord["@id"];
    if (typeof id !== "string") throw new TypeError("json-ld: @graph member must have a string @id");
    const subject = subjectFromIri(base, id);
    for (const [key, raw] of Object.entries(nodeRecord)) {
      if (key === "@id") continue;
      if (!key.startsWith("prop:")) throw new TypeError(`json-ld: unexpected key ${key} outside the prop: predicate namespace`);
      const predicate = key.slice("prop:".length);
      const values = Array.isArray(raw) ? raw : [raw];
      for (const value of values) {
        triples.push(assertTriple({ s: subject, p: predicate, o: objectFromJsonLd(base, value) }));
      }
    }
  }
  return triples;
}
