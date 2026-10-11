# Base58 implementation received at its serialized-data owner

The canonical codec is `@red-cup-engineering/base58-encoding-service` in
`red-cup-engineering/serialized-data-services-section`, at
`services/base58-encoding-service/src/base58.mjs` (provider blob
`c6dcd03ca3b2673e94215685b6b40dca4b3ac04f`). Its Bitcoin alphabet and
leading-zero handling retain the byte-input and Buffer-output interface.

The receiving merge preserves current main’s later `@scure/base` wrapper
byte for byte under this directory. The original proposal’s older codec
remains in its Git history. Neither legacy carrier is a runtime source.

The existing section export `./base58` remains available through a forwarding
module. Its canonical owner is a runtime dependency, so consumers can continue
using the public path without importing the preserved implementation or
requiring a development-only dependency. Binary-text’s independent codecs
continue to use `@scure/base`.
