# CBOR services section

One RFC 8949 codec uses native `cbor2` 2.4.0 wire primitives; there is no
parallel house float, argument-width or recursive wire decoder. The iterative
house writer retains deeply nested arrays and existing encoded bytes. Its
application carrier admits booleans, null, finite numbers, BigInts in the inclusive range [-2^64, 2^64-1],
well-formed text without normalization, byte strings, arrays and plain objects
with text keys. Undefined object entries are absent; negative zero becomes zero.
Wire integers decode to Numbers exactly within the safe-integer range and to
BigInts outside it. Wire floats remain Numbers, including unsafe integral
Numbers; integer and float encodings are not conflated. `decodeCanonical` refuses bytes outside this
profile or its deterministic encoding. BOM characters and prototype-looking
keys remain ordinary data. `canonicalEqual` compares encoded bytes;
`canonicalCborToNiUri` names canonical bytes through the existing NI operation.
The root exports and `apps/cbor-cli.mjs` retain encode/decode/derive-ni operations.

`./transformations` exposes four synchronous, bounded operations, also sold on
the existing market Worker at $0.0012 each:

- `encodeJsonCbor({value})`: ordinary JSON to deterministic CBOR and exact
  `application/cbor` Base64 bytes. No negative zero or unpaired surrogates.
- `decodeCborJson({carrier})`: one CBOR item to ordinary JSON. Nonpreferred and
  indefinite encodings are admitted; bytes, tags, unsafe integers, negative zero,
  nonfinite/simple/undefined values and nonunique/non-text keys are refused
  rather than silently converted.
- `diagnoseCbor({carrier})`: native RFC diagnostic notation, retaining CBOR-only
  values and visible encoding distinctions. Tag meanings are not executed.
- `checkDeterministicCbor({carrier})`: true/false for RFC 8949 core deterministic
  encoding, with a bounded reason. This encoding check retains negative zero
  and does not claim application validity or semantic tag validation.

The exact byte carrier has only `mediaType: "application/cbor"` and canonical
padded `contentBase64`. One complete item only; no trailing sequence. Conversions
admit at most 65536 JSON/CBOR bytes, 8192 nodes/parsing events and depth 64;
diagnostic output is bounded to 524288 UTF-8 bytes. Full JSON escaping fits the
524800-byte HTTP request limit. Malformed or unrepresentable inputs are refused
before payment. No storage, model, fetch or upstream API participates.

Primary conformance material: RFC 8949 Appendix A, supplied by
`hildjj/test-vectors@cbab23c3fa16a0c9323e1bdc4783e6bbc3a2966d`.
