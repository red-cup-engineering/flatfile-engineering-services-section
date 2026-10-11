# Computer content services section

Content services own operations on content carriers directly beneath computer
data services. A filesystem path is an explicit acquisition locator, while a
content digest is evidence about exact bytes; neither substitutes for the
other or establishes referent identity.

Its direct children are the next concepts content makes possible: addressing,
provenance, graphs, media, documents, and knowledge systems. Protocols and implementations are
nested beneath those prerequisites rather than listed as content's peers.

`knowledge-systems-engineering-services-section` owns operations that preserve
or make a knowledge collection accessible through its content-specific platform.

The `./typed-resource-classification` library export supplies the type algebra over an
addressed content carrier: a type is an earned restriction on a `{ path, content }`
resource, graded by its content-commitment corner and completion rung. The format
codecs (JSON, XML/SVG, HTML) specialize that kernel rather than each growing its
own recognition scheme. The `./catalog` and `./recognition` library exports provide a
declarative catalog of recognizers compiled into the restriction chain, returning
a classification receipt that carries the whole witnessed proof path. `./language-cone`
compares declared apexes, locator seating, and supplied normal-form identities.
Addressed-classification callers supply their writing capability explicitly.
Node-workspace topology and code conformance remain in javascript-node custody.

`computer-content-graph-engineering-services-section` owns the typed,
deterministic reading of content and witnessed relations. Its graph and event
mechanics remain leaf services of that content capability rather than a
parallel generic-data-structure hierarchy.

`semantic-content-identity` (this package's `./semantic-content-identity` export) owns the registry-compatible version 2
typed normalized-RMN carrier used by existing content consumers. Its identity
is an RFC 6920 commitment to the exact deterministic-CBOR carrier bytes; it
does not turn a digest into evidence about an external referent. The service's
packed-artifact assay is the release boundary: workspace resolution alone is
not evidence that its registry dependency closure is usable.

This library's `./semantic-content-identity` export carries the version 3
normalized-SEN envelope and `application/sen+cbor` receipt transport. Its
`./resource-term` and `./receipt-sen` exports use that contract. The sibling's
version 2 RMN contract and this version 3 SEN contract remain distinct;
historical receipt bytes and identities are retained under their original law.

Under documents and articles, `article-content-path-grammar-service` owns the pure
`content/text/documents/articles/notes/YYYY/MM/DD/` address law. Generic carrier
reads belong to file services; Markdown admission and vault traversal belong
to Markdown file and vault-directory services.
Under addressing, URI, and NI, `immutable-content-custody-service` retains exact
NI-addressed bytes only through an injected object-store capability. The documents subtree records
path-relative operational receipts without turning a file path into byte
identity. Provider output is content, not truth or governance authority.

`dataset-store` (`./dataset-store`) is the canonical relational dataset custody
recovered from the retired file-data section: a content-addressed store of
canonical JSON datasets whose provenance is recorded in
`provenance/dataset-custody-recovery.json`. `content-tree-reading-service`
reads a content tree.
