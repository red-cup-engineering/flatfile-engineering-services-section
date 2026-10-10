# Address representations

The existing NI API names exact bytes and verifies canonical authority-free
SHA-256 NI names. Its JSON text/Base64 entry now refuses malformed Unicode
and noncanonical Base64 instead of silently naming substituted bytes.
The HTTP URL admission API retains admitted source strings and rejects implicit
object/string coercion. Existing feed and actor consumers keep these APIs.

The address-transformations entry sells native WHATWG URL parsing,
normalization and relative resolution; ordered form data to/from JSON pairs;
and RFC 6920 SHA-256 content naming and verification. URL normalization follows
the platform algorithm, including IDNA, IP and dot-segment normalization.
It is not a strict RFC 3986 validation or safe-browsing verdict.

Form conversion uses the native application/x-www-form-urlencoded algorithm
with a loss-refusing UTF-8 input profile. Malformed escapes/UTF-8 are refused,
duplicate and empty keys survive, and tuple order is retained.

Paid transformations admit 65536 input/output bytes, up to 2048 form pairs,
and 65536 decoded content bytes. JSON bounds are 8192 nodes and depth64.
NI verification returns a mismatch as a useful analysis result; malformed
names/carriers are refused before payment. No network or filesystem access,
model, clock or random source is needed.

The URI-template entry provides bounded RFC 6570 Level 4 expansion and grammar inspection, including verified erratum 6937. Explicit own JSON variables preserve flat list/map distinctions, null omission, empty strings and percent-encoded variable names. Reserved expansion retains percent-triplet spelling; ordinary expansion encodes data delimiters. Prefixes count Unicode characters, including complete percent-encoded UTF-8 characters. Limits are 8192 template bytes, 1024 references, 256 variable names, 8192 scalar members, 1024 entries per composite and 65536 combined variable-name/value bytes and 65536 output bytes. The primitive performs no fetching, normalization or target authorization. The paid request carrier admits full JSON escaping. The native catalogue builder uses this same operation for outbound reference construction; inbound matching remains a different operation.
