# Semiotic Content Address — Computer Data library

The original Data-owned, protocol-independent carrier commitment lives here.
Its implementation is received byte-for-byte from the former
`computer-content-address-engineering-services-section/src/semiotic-content-address.mjs`,
with its adversarial NFC, ownership, cycle, and canonical CBOR tests retained.

The canonical URI and cryptographic primitives continue to come from URI,
CBOR and Cryptographic Data Engineering; this library does not implement
another hash, CBOR codec, or parser. Raw-byte address records belong beside
carrier commitment but remain a different export from canonical JSON-shaped
carrier identification.

Exposed from `@red-cup-engineering/computer-data-engineering-services-section/semiotic-content-address`
and `.../raw-content-address` when the Data package revision containing
this library is published. SignCell's installed dependency must not select
those names until that specific release exists. SEN normalization and
proof-path evaluators remain with their competent code owners. Physical
record placement, NI peer transport, and mutable named roots do not live here.
