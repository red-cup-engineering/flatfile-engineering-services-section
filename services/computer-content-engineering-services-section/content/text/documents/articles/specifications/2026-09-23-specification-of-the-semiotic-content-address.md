---
title: "Specification of the semiotic content address"
date-created: 2026-09-23
status: realized in part; carrier layer seated, semantic and proof-path layers named with their present homes
part-of: computer-content-engineering-services-section
version: 0.1.0
stability: draft
authors:
  - emsenn
  - claude-fable-5-1
---

# Specification of the semiotic content address

A semiotic content address (SCA) is the house's name for a piece of content.
Everything the house stores, sends, cites or settles is named this way, and
nothing else is a content name. This document states what an SCA is, which
standard formats it is made of, and which module owns each part.

## Standard formats underneath

An SCA is a specialization of public formats. It adds no encoding of its own.

- **RFC 6920 `ni:` URI**, SHA-256 form only: `ni:///sha-256;` followed by the
  43-character unpadded base64url digest. The last character must be one of
  the sixteen canonical final sextets, so four spellings cannot name one
  digest. Owner: `@red-cup-engineering/uri-services-section/ni-uri`
  (`makeNiUri`, `isNiUri`, `niUriDigest`, `niUriDigestBytes`, `verifyNiUri`,
  `NI_URI_PATTERN`).
- **RFC 8949 core-deterministic CBOR**: shortest heads, definite lengths,
  map keys in encoded-byte order, shortest exact floats, no tags. A decoder
  refuses non-canonical bytes. Owner: `@red-cup-engineering/cbor-services-section`
  (`encodeCanonical`, `decodeCanonical`, `canonicalEqual`,
  `canonicalCborToNiUri`).
- **Unicode NFC** for every string and map key.
- **RFC 8785 canonical JSON** is the house's canonical JSON *text*
  (`@red-cup-engineering/json-services-section/canonical-json`). It is a text
  surface, not an addressing input: hashing canonical JSON text yields a
  valid `ni:` name for those bytes, but that name is not an SCA of the value.

## The three layers

### 1. Carrier commitment (data)

A **semiotic carrier** is a JSON-shaped value: `null`, booleans, safe
integers, bigints, NFC strings, byte strings, arrays, and plain objects with
string keys. An object entry whose value is `undefined` is absent.

- `canonicalizeSemioticJson(value)` returns the carrier's canonical form (NFC
  strings and keys; refuses non-integer numbers and keys that collide after
  normalization).
- `semanticBytes(value)` is the canonical CBOR of the canonical form;
  `decodeSemantic(bytes)` inverts it.
- `semanticId(value)` is the `ni:` name of `semanticBytes(value)`. This is the
  carrier commitment for new code.
- `identifyContent(value)` is the `ni:` name of the canonical CBOR of the value
  *as given*, without normalizing. Typed things, type identities and cells use
  it today. It agrees with `semanticId` on every carrier that is already
  canonical; it differs only for non-NFC strings and non-integer numbers.

Owner: `@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address`.

A token is opaque. No consumer decodes a token to learn what it names; it
reads the claim or carrier the token commits to and verifies the commitment.

### 2. Semantic identity (code)

The semantic identity of a typed claim is the carrier commitment of one
**normalized semantic-content envelope** (version 2):

| field | meaning |
|---|---|
| `kind` | `relation-model-notation.normalized-semantic-content` |
| `version` | `2` |
| `objectKind` | what sort of object this is (non-empty NFC text) |
| `semanticType` | the SEN type the body inhabits |
| `normalizationProfile` | `urn:rce:rmn:normalize:0.0.1` |
| `settlementProfile` | `urn:rce:settlement:identity:0.0.1` |
| `settledBody` | the closed SEN term in normal form |
| `witnessRoot` | the `ni:` name of the evidence bundle the settlement consumed (`EMPTY_WITNESS_ROOT` when none) |

Two envelopes are the same content exactly when their bodies reduce to the
same normal form under the same type, object kind, profiles and witness root.
This layer needs the notation's typing and evaluation, so it belongs to the
semiotic expression notation (SEN), not to the data section. Today it is
`identifyNormalizedSemanticContent`, `identifyJsonSemanticContent`,
`admitNormalizedSemanticContent` and `verifyNormalizedSemanticContent` in
relation-model-notation's runtime; they move with the notation.

### 3. Proof-path coordinate (code)

A proof-path address is a typed term whose readable surface is a derivation:
each earned path segment is a generating or restricting morphism, and the
root-to-leaf path is their composition. The readable surface is a
**semiotic resource name** (SRN). Three generators build it:

| surface | relation | reading |
|---|---|---|
| `A.B` | generation | B is generated from A |
| `A:B` | witness | B witnesses A |
| `A-B` | obstruction | B restricts A |

`_` escapes a segment from categorical reading. `?` is reserved for a
parameterized probe (the observation side of the Chu pairing), never a
fourth generator.

The addressed coordinate is the triple **`{surface, token, claim}`**:
`claim` is the SEN term the surface reads to, `token` is the semantic identity
(layer 2) of that claim under object kind
`semiotic-resource-name.path-claim`, and `surface` must equal the unique
rendering of the claim. A coordinate is valid only when all three agree.
Today this is `semiotic-resource-name-services-section` (under
relation-model-notation) and the filepath leg is
`computer-filepath-engineering-services-section`
(`proof-path-structuration`, and `semiotic-computer-filepath` for identity);
the SRN codec and coordinate move with the notation.

Every protocol surface (HTTP route, MCP resource URI, ActivityPub IRI, package
export key, filesystem path) is a *reading* of an address term. That all
readings of one term agree is a formal obligation (the PPA cone of readings),
not yet a theorem.

## What is not an SCA

These exist in the tree and are to be folded into the layers above:

- `ni:` names minted over `JSON.stringify` output: valid RFC 6920 names of
  those bytes, but key-order dependent, so not names of the value
  (inference resource reservations, npm semantic-version audits).
- `ni:///sha-256;<hex>` strings: not RFC 6920 (hex instead of base64url);
  they fail `isNiUri` (the agent harness's semantic record journal and tool
  evidence). Their stored identities are in journals; converting them is a
  migration of those journals, not a renaming.
- Bare `sha256:<hex>` strings and `urn:` identifiers: protocol values of the
  systems that define them (OCI digests, EVM events), never house content
  names.

## Owners, in dependency order

```text
uri-services-section/ni-uri            RFC 6920
cbor-services-section                  RFC 8949 + ni: of canonical bytes
computer-content-engineering-services-section/semiotic-content-address
                                       carrier canonical form and commitment
semiotic expression notation (code)    semantic identity, SRN coordinate
```
