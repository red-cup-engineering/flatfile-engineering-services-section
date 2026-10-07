---
title: "What is EAVT?"
description: "A general explanation of the entity-attribute-value-time model: rows as atomic facts, append-only accrual, folding to present state, and why time is part of the fact."
date-created: 2026-08-30
type: explanation
name: what-is-eavt
keywords:
  - eavt
  - append-only
  - facts
  - data-model
---


EAVT is a way of recording knowledge as **atomic facts**. One row states
one thing about one subject at one moment:

- **e** — the entity: the subject the fact is about.
- **a** — the attribute: the predicate, what is being said of it.
- **v** — the value: the object of the statement, a first-class thing in
  its own right (not an annotation hiding inside the claim).
- **t** — the time (or transaction): the witness of when — part of the
  fact itself, not metadata around it.

Read as a sentence: *e's a is v, as of t.* "The pebble's location is the
riverbed, witnessed at t=2."

## Facts accrue; they never change

An EAVT store is **append-only**. Nothing is edited in place. When the
world changes, a new row is appended; when a claim is withdrawn, the
withdrawal is itself a new row (a retraction), leaving the original
fact in the record — because it *was* asserted, and that history is
knowledge too. "Current state" is not stored anywhere: it is **derived**
by folding the trace — replaying the rows in order and letting later
facts and retractions settle against earlier ones. Delete the derived
view and nothing is lost; the rows remain the sole truth.

This is what makes the model suit auditable and multi-agent systems: a
trace can be re-read by anyone, folded again from scratch, and checked
row by row — every present belief has a visible provenance path back
through the rows that produced it.

## Lineage

The shape is old and convergent. RDF says subject-predicate-object;
EAVT is that triple plus the witness. Datomic named its unit the datom —
entity, attribute, value, transaction — and built its database as
exactly this accrual-and-fold. Event sourcing in ordinary backend
engineering is the same discipline with coarser grains: store what
happened, derive what is. EAVT is the finest-grained, most regular form
of the family: every fact the same four-part shape.

## The reading used here

In this tree, each row is read as a **predication cell**: e the
SUBJECT, a the PREDICATE, v the OBJECT, t the witness — and an appended
row is a positive *affirmation* of its cell. Folding does not merely
overwrite: evidence for and against a cell accumulates, so a settled
cell can be affirmed, denied, unknown, or held in contradiction (the
FOUR values), and contradiction is representable rather than being
averaged away. Downstream of plain EAVT sits **SEAVT** — EAVT where
each e, a, and v is meant to be RMN, i.e. semantically typed claims
rather than generic values — kept in the witness-journal custody.

Plain EAVT as realized by this section — the codec, durable append,
disk read-back, fold, settle, and section projection — is documented in
this section's README and its per-verb scripts.
