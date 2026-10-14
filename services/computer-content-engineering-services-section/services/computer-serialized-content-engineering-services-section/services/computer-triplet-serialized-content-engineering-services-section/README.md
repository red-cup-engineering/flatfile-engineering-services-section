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
projected into this standard interface without changing its source:
`reading-rdf` exports `putReadingRdfGraph({folded,base,graph,storeEndpoint,
fetchImpl,headers})`. It reuses `readingTurtle` and sends a named-graph
`PUT` through the same Graph Store transport, retaining affirmative
`prov:wasDerivedFrom`, opposing `owl:NegativePropertyAssertion`,
and simultaneous evidence in `ws:StableClaim`. The source and
permissions remain with the owner: this operation must be invoked only
on a source-qualified reading whose named graph the caller controls.
It returns the actual HTTP response and **does not** mint an ontology,
create a database, infer truth, or claim delivery.

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
