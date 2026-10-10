# bcp-14-services-section

The BCP 14 requirement statement as data: a sentence carrying exactly one
RFC 2119 / RFC 8174 key word in capitals, read as a subject, a force-weighted
predicate, and an object ("this [must | should |
may | must not] <verb> that", a subject-predicate-object triple whose
predicate is a weighted unsaturated function).

- `data/records/schema/bcp-14-requirement.schema.json` is the record.
- `services/read-bcp-14-requirements-service` reads a text into a set of
  those records, refusing sentences with no key word or more than one.

Consumers: the specification workbench (metroplat, a thin verb over this
operation), the work rail (requirement force on an intent item), and the
utterance-to-rows operation of the knowledge-corpus kernel.
