# Computer filepath engineering

A filepath is data. This section carries reversible POSIX segments, typed term
addresses, lexical path operations, and witnessed proof paths. These functions
perform no filesystem IO and import JSON admission from serialized Data.

- `lib/segments.mjs` is the UTF-8 byte-escape codec shared by typed addresses and
  proof paths. Decoding accepts only canonical encodings.
- `lib/address.mjs` maps terms to `<root>/<term>/<leaf>.<type>` and back. Its
  historical `~json:` and `~string:` representation preserves stored addresses.
- `lib/posix.mjs` normalizes and projects lexical paths.
- `services/proof-path-structuration-service` derives a path from generator
  witnesses, checks every edge, and retains settlement coordinates separately
  from their path rendering and cryptographic identities. Reachability uses a
  finite visited-node traversal, including for cyclic evidence.

The relational engine and Metroplat compose these Data functions with their
own utterance/EAVT carriers. The semiotic identity service composes proof
coordinates with RMN identity. Neither system maintains another path codec.

The recovered [filepath and entailment specification](content/text/documents/articles/notes/2026/06/18/posix-filepathing-with-curry-howard-directionality-by-yoneda-embedding.md)
and its supporting documents live beside this capability. Their historical
source paths record the research context; the current implementations are the
modules listed above.

Run `npm test` here for the address, path, witnessed-route, and coordinate tests.
