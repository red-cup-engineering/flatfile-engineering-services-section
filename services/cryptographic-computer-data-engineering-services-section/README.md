# Computer data cryptography services section

The union's single cryptography core for admitted data.
One audited secp256k1 curve and one keccak256 serve every settlement family — Hive/graphene *and* every EVM chain — so no downstream enterprise hand-rolls its own key math.
Offered to the RCE Internal Market as a directly contractable service.

## Holdings

- `src/secp256k1.mjs` — BigInt secp256k1 (keygen, RFC6979 signing, low-S, recovery).
  Shared by Hive and EVM; consuming enterprises import from here.
- `src/keccak256.mjs` — Ethereum-pad keccak-256 (node:crypto ships only SHA-3, which is not interchangeable).
- `src/hash.mjs` — sha256 / hmac-sha256 / ripemd160.
- `src/evm.mjs` — EVM identity & signing: address derivation, EIP-55 checksum, `signDigest` (v-encoded), EIP-191 `signMessage`, `recoverAddress`.
  The primitives x402 settlement needs.
- `src/cryptographic-services.mjs` — the ActivityStreams `solicit-service`/`invoke-service` contract face; stdin carries one addressed activity and positional direct-invocation bypasses are refused by omission.
- `src/seal.mjs` — sealing at rest: AES-256-GCM `sealSecret`/`openSecret` (and `sealJson`/`openJson`) in the `v1.<iv>.<ciphertext‖tag>` base64url form, `generateKeyBase64`, `SealFormatError`/`SealDecryptError`.
  Seated here 2026-09-12 from the Assist engine's private WebCrypto copy (byte-compatible; the Worker runs with nodejs_compat).
- `src/integrity.mjs` — `sha256Hex`/`sha1Base64`/`hmacSha256Base64Url`/`timingSafeStringEqual`/`randomBase64Url` string-oriented host encodings, composing `src/hash.mjs`'s own `sha256` for the SHA-256 family.
  Merged 2026-09-11 from the separate `@red-cup-engineering/cryptographic-integrity-service` package (deleted; consumers repinned here).
- `src/portable-sha256.mjs` — a pure-JS, node:crypto-free synchronous SHA-256 transformation from bytes to a lowercase hexadecimal digest. Browser packets use this leaf when they must form a deterministic address synchronously.

## Correctness

`npm test` checks the core against published Ethereum vectors — keccak256 empty and `"abc"` digests, the EIP-155 address, private-key-1 address, EIP-55 casing, and sign→recover round-trips.
These keys hold value; the primitives are proven, not asserted.

## Boundary

The section derives identity and produces signatures.
It never broadcasts, never moves value, and never persists a private key — key custody and settlement broadcast belong to the holding enterprise (e.g. aagaard for Hive; the x402-metered service for EVM payments).
This is pure compute behind a contract face.

Cryptography consumes an explicitly typed, normalized, settled, and canonically encoded preimage.
Hashing can commit those bytes and signatures can attribute a commitment; neither operation creates semantic meaning, performs settlement, or collapses a proof path into its endpoint.
Algorithm implementation source remains computer code even though this service is classified by the data relation it provides.

## Org

- **Over**: red-cup-engineering (Internal Market)
- **Owns**: (no child teams yet)

## Migration note

aagaard currently carries its own copy of the secp256k1 curve under `.../hive/waggle/`.
The consolidation this section exists for is completed by repointing aagaard's waggle at this module; until then, treat this section's copy as and aagaard's as legacy pending retirement.
