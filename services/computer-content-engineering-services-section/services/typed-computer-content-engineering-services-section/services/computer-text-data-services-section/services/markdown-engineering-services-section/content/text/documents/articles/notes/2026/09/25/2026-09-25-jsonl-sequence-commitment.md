---
title: "JSONL Sequence Commitment"
description: "A data-layer commitment profile for ordered JSON values: RFC 8785 bytes, SHA-256 item and rolling digests, and a deterministic Merkle root."
date-created: 2026-09-25
status: current
part-of: computer-data-engineering-services-section
provenance: "Supersedes the 2025-12-16 and 2026-06-17 deterministic event-stream-record drafts."
---

# JSONL Sequence Commitment

`jsonl-jcs-sha256-sequence-v1` is a data transformation over an ordered
sequence of admitted JSON values. It returns each value's RFC 8785 canonical
JSON text and SHA-256 digest, a prefix-verifiable rolling digest, and a Merkle
root. Its implementation is the JSONL data service's
`commit-jsonl-records.mjs`; `verify-jsonl-commitment.mjs` recomputes the
result and reports the first divergent field and ordinal.

## Carrier and profile

The carrier is an ordered JSONL sequence. A record is canonicalized to UTF-8
RFC 8785 JSON before it is hashed. Let `C_i` be the canonical bytes and `H`
be SHA-256:

- item digest: `D_i = H(C_i)`;
- first rolling digest: `R_0 = D_0`;
- subsequent rolling digests: `R_i = H(bytes(R_(i-1)) || C_i)`;
- Merkle leaves are the `D_i`; internal nodes are `H(left || right)`, with an
  odd final node duplicated.

An empty sequence has no rolling digest and no Merkle root. A profile names
all of those decisions, rather than putting an ambiguous `algo` field into
the application data it commits.

## Relation to EAVT and SEAVT

This profile does not define an event schema. It has no `source_id`, sequence
counter, monotonic clock, event type, payload, or semiotic interpretation.
EAVT owns the generic witness row `{e,a,v,t}`; its dated custody feed and
derived append trace supply source and order, while `t` remains witness
material. SEAVT is an EAVT specialization whose E/A/V coordinates are closed
semiotic terms. Either carrier can ask the JSONL operation to commit its
ordered rows without acquiring a second event model.

The commitment establishes content and order integrity only. It does not
authenticate a producer, authorize a write, conceal a record, or establish
non-repudiation; those require separate identity, custody, and authorization
evidence.

## Legacy disposition

The two archived deterministic-event-stream drafts supplied useful pressure:
canonical bytes, reproducible verification, prefix commitments, and optional
Merkle blocks. Their `{seq, mono_ts, source_id, type, code, payload, algo}`
envelope had no adopter and conflicts with the EAVT witness carrier, so it is
superseded rather than preserved as a compatibility format.

Their purported frozen vectors are also not authoritative: SHA-256 of the
first draft's displayed canonical bytes is not the published hash, and its
two-record rolling result is likewise unreproducible. The current JSONL test
contains executable, byte-level vectors for the realized profile.
