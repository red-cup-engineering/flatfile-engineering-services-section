# Serialized computer-content engineering services section

Owns codecs between admitted computer content and serial byte or text forms.
This is the direct home for general serialization formats.
A domain-specific syntax is nested beneath the model it serializes when that model must exist first.

EAVT is seated beneath JSON Lines at
`json-services-section/services/jsonl-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/services/jsonl-services-section/services/eavt-services-section`.
It owns the `{e,a,v,t}` fact algebra while composing JSON Lines for its serial
carrier; filesystem and stream effects remain outside the engine.

RDF's term model, named graphs, N-Quads, Turtle, canonicalization, SPARQL
projection, and schema-to-ontology projection live together under
[`computer-triplet-serialized-content-engineering-services-section`](services/computer-triplet-serialized-content-engineering-services-section/README.md).
They share the RDF triplet carrier and its concrete serializations; they do
not belong in the general computer-content section.

- [icalendar-services-section](services/icalendar-services-section/README.md) owns RFC 5545 iCalendar scheduling data: RRULE recurrence expansion and due-event derivation shared across the tree's schedulers.

RFC 9651 HTTP structured fields are available through `http-structured-fields` (the exact native `http-structured-fields` 1.0.0 supplier) and `http-field-transformations` (the bounded JSON carrier). `fieldToJson({kind,text})` returns `{kind,value}`; `jsonToField` accepts that same carrier and returns `{text}`. Select `item`, `list`, or `dictionary` according to the field definition: legacy Accept, Cookie, and Cache-Control do not become structured fields by being passed to this parser.

Bare values retain native `{type,value}` tags for integer, decimal, string, token, byteSequence, boolean, date and displayString. Binary JSON values use canonical padded Base64; dates use exact signed epoch seconds. Items contain ordered `parameters` pairs, inner lists contain items, and dictionaries are ordered key/member pairs. Native parsing implements RFC duplicate-key overwrite; JSON serialization refuses duplicate keys and decimal rounding. The priced carrier admits 16384 field bytes and 65536 canonical JSON bytes. The native grammar export itself imposes no market-wide resource gate.

Native compression/decompression is available through ./compression, using the existing media-typed Base64 carrier. Select gzip, deflate (zlib wrapper), or deflate-raw. Input and output are each limited to 65536 bytes. Decompression follows the single-stream WHATWG profile and finishes native validity/checksum checks before returning bytes. The caller supplies decodedMediaType; there is no media inference. Compressed bytes are not a canonical representation.

UTF-8 conversion and Unicode normalization are available through `./text-codecs`. `encodeUtf8Text({text})` returns the existing byte carrier with exact `text/plain;charset=utf-8`; `decodeUtf8Text({carrier})` returns text using fatal native UTF-8 decoding. A leading BOM remains U+FEFF, embedded NUL and line endings remain unchanged, and lone surrogates or malformed/overlong UTF-8 are refused. Both directions are bounded at 65536 UTF-8 bytes. `normalizeUnicodeText({text,form})` selects NFC, NFD, NFKC or NFKD explicitly and returns the changed flag and before/after byte counts; both forms are bounded at 65536 bytes. Compatibility normalization can alter distinctions or meaning. The runtime supplies Unicode behavior; no Unicode-version-specific conformance claim is made.

Binary/text alphabets use exact @scure/base 2.4.0 through ./binary-text: uppercase unpadded Base16, uppercase padded Base32, Bitcoin-alphabet Base58, and unpadded Base64url. Encoders take {carrier}; decoders take {text,mediaType}, preserve the caller's media type, and require native canonical encoding. Byte limits are 65536 for the linear codecs and 1024 for Base58's quadratic conversion. Base58 does not add a checksum, infer a network, or establish wallet ownership. The old handwritten Base58 arithmetic is removed; ./base58 keeps encode(bytes) and decode(text) returning a Buffer for existing Hive WIF/public-key consumers. Those consumers retain their separate checksum and authority rules.

Two native MIME operations are available through ./mime-type using exact whatwg-mimetype 5.0.0: parseMimeType({mediaType}) and serializeMimeType({type,subtype,parameters}). They return type/subtype, essence, ordered name/value pairs and the native serialized value. WHATWG parsing is deliberately forgiving (first duplicate wins; malformed parameters skipped), not a strict RFC/IANA validator or content sniffer. Typed serialization refuses duplicate names and invalid token/quoted-string components. Each MIME value is limited to 4096 UTF-8 bytes and 32 retained parameters; transport permits JSON escape expansion. Existing extension/compressibility knowledge is retained; native mimeTypeEssence replaces ad hoc header splitting in classification and actual HTTP/web representation consumers. Host deployment of those consumers remains separate.
