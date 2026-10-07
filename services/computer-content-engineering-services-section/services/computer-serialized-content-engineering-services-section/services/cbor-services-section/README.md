# CBOR services section

This path proves RFC 8949 core-deterministic ("canonical") CBOR
serialization and RFC 6920 `ni:` naming of CBOR byte strings.

- `cbor-codec-service` is the one canonical codec: `encodeCanonical`/
  `decodeCanonical` over admitted carrier values (booleans, `null`,
  safe-integer numbers, bigints, strings, byte strings, arrays, and
  plain objects, recursively).
- `cbor-ni-service` names one canonical CBOR byte string with its RFC 6920
  SHA-256 `ni:` URI, composing `@red-cup-engineering/ni-services-section`.
- `encode-cbor-service`, `decode-cbor-service`, and `derive-cbor-ni-service`
  are this section's own one-function operations over those two codecs,
  exposed together as this section's public algebra (`src/cbor.mjs`) and
  its composed CLI face (`apps/cbor-cli.mjs`).
