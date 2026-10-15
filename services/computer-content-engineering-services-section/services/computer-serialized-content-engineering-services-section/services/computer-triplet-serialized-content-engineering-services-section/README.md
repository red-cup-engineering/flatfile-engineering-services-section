# RDF triplet serialized-content engineering services section

This section owns RDF's triplet carrier and its serial transformations: term
construction, named-graph quad-set assembly, N-Quads and Turtle
serialization, RDFC-1.0 canonicalization, SPARQL projection, and
schema-to-ontology projection. Each primitive remains separately importable;
this section gives the family one discoverable home beneath serialized content.

## Concrete serializations

Concrete RDF syntaxes live alongside the model and algorithms they serialize:

- `services/n-quads-serialization-service` renders named-graph quad sets as
  N-Quads text.
- `services/turtle-services-section/services/turtle-term-writing-service`
  renders admitted RDF terms in Turtle syntax.

These transformations produce serialized text; filesystem custody remains a
separate concern.

## Schema-driven ontology projection

- `services/json-schema-to-owl-shacl-service` derives an OWL class model
  and SHACL shapes from a set of JSON Schema files, built on this
  section's own term/named-graph/Turtle primitives above, so a consuming
  section's schema stays its one authored source and the `.ttl` is
  generated, never a second hand-written artifact.

## The Group's ontology over SPARQL 1.1

`ontology-endpoint` pins the glossary's remote schema.org JSON-LD context
(`pinContext`), loads the glossary's `public.jsonld`
(`561-group-services-section`, `data/records/knowledge/glossary/skos/`) into an
Oxigraph store (`loadOntology`) and serves it read-only over the SPARQL 1.1
Protocol with the union of graphs as the default graph (`serveOntology`).
`scripts/serve-ontology.mjs` runs both. `sparql-query-tool` is the
`sparql_query` tool definition (`{name, description, inputSchema, handler}`);
it queries through this section's own `sparqlProtocol`, and
`mcp-engineering-services-section` serves it over stdio.

```
node scripts/serve-ontology.mjs --jsonld <public.jsonld> --location <store dir> --bind 127.0.0.1:7878
node --test test/ontology-endpoint.test.mjs   # OXIGRAPH_BIN names the oxigraph binary; ONTOLOGY_JSONLD optional
```

The store and endpoint are Oxigraph's own; this section adds no evaluator.
The capability was first committed under `agent-organization-engine/lib/knowing`
in computer-engineering-services-section (PR 425, commit 3da68a5f) and carried
here, with that commit, to its owning section.

## W3C RDF interoperability over existing owners

The exported `./sparql-http-client` uses **standard HTTP** with a real RDF
service. `sparqlProtocol(endpoint, text, options)` sends SPARQL 1.1 GET or
POST queries (`application/sparql-query`) and separately authorized POST
updates (`application/sparql-update`). `graphStoreProtocol(endpoint,
options)` reads, replaces, appends or deletes a default or named RDF graph
using the W3C Graph Store HTTP Protocol. It exchanges Turtle, JSON-LD,
N-Triples or RDF/XML representations as the external service supports them.

These functions **do not create a triplestore, reinterpret OWL, parse arbitrary
SPARQL, invent graph identity, acquire rights or bypass a receiver's
authentication**. The caller binds the real query/update or graph-store
endpoint and its authorized HTTP credentials; operations return the actual
HTTP response. Redirects are refused so secrets cannot be forwarded to a
different endpoint. GET is never accepted for an update.

For example, with an *existing, authorized* SPARQL service:

```js
import {sparqlProtocol,graphStoreProtocol} from
  "@red-cup-engineering/computer-triplet-serialized-content-engineering-services-section/sparql-http-client";
const response=await sparqlProtocol("https://example.org/sparql",
  "SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 20");
const results=await response.json(); // W3C SPARQL Results JSON as issued by the server
const turtle=await (await graphStoreProtocol("https://example.org/data",
  {graph:"urn:my-authorized-graph"})).text();
```

An existing **folded, attributed SignCell/EAVT subject reading** can be
projected into standard RDF without treating its text as a fact.
`reading-rdf` exports `readingClaimId(entity, cell, {base,subjects})`,
`readingTurtle`, `readingJsonLd` and
`putReadingRdfGraph({folded,base,graph,storeEndpoint,fetchImpl,headers})`.
The canonical SCA/NI identity of a **documentary claim position** commits
to its resolved subject/predicate IRIs and **typed RDF object term**,
not to the evidence currently for or against it. Changing the source
revision, predicate or literal-versus-IRI interpretation changes its
identity. New witnesses change evidence, not the position's address.
Canonical NI and URN evidence identities remain navigable RDF references;
plain untyped source labels remain attributable labels, not inferred IRIs.

The RDF reading never emits an unqualified domain assertion from source
frontmatter. `ws:AffirmedClaim`, `ws:OpposedClaim` and
`ws:ContestedClaim` are individually **reified `rdf:Statement`** nodes
with separate for/against provenance; absent evidence supplies no statement.
This is **not** `owl:NegativePropertyAssertion` and not a verified fact.
The retired `claimOnly` toggle is refused, not silently permitted.
Malformed typed objects or witness polarity arrays refuse before graph
submission. Domain assertions, real authority and institutional settlement
must come from the rightful independently checked provider.

`putReadingRdfGraph` sends this projection to the caller's designated
named graph by W3C Graph Store PUT. The source and access rights remain
with the owner: only a caller authorized for that source and graph can
invoke the external mutation. An HTTP success is not independent receiving,
an OWL inference, a proof of a claim or delivery to a buyer.

Tests: `node --test test/sparql-http-client.test.mjs
test/reading-rdf-graph-store.test.mjs`. For a real consumer,
compare the stored named graph read back from the provider with the
source witness and separately check graph-store write authorization.
A successful synthetic HTTP test does not establish a live Semioverse
graph-store installation.

Use `node --test test/sparql-http-client.test.mjs` to exercise the
query/update/graph-store transport, negative inputs and HTTP refusals.
The existing `./sparql-text` is explicitly a **limited BGP profile**,
not a full W3C SPARQL 1.1 engine. For arbitrary SPARQL, OWL reasoning,
SHACL validation and large-scale RDF storage, use an existing conforming
RDF service and this standard transport rather than extending a local
handwritten BGP parser. An L-Space document-index route is not automatically
a semantic graph: qualified RDF graph contents must be sourced from admitted
Science/SignCell/SEAVT data by the owning consumer.
