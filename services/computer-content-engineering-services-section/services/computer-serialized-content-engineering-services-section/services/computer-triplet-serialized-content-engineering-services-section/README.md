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
