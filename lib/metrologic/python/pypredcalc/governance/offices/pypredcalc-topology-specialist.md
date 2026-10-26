---
title: "PyPredCalc Topology Specialist"
type: office
slug: pypredcalc-topology-specialist
scope: pypredcalc-topology-subpackage
action-domain:
  - write-pypredcalc-source
  - read-any-corpus-entity
  - read-any-pypredcalc-source
  - create-task-record
  - immunity-from-spec-violating-duty
deontic-profile:
  write-pypredcalc-source: power
  create-task-record: power
  read-any-corpus-entity: privilege
  read-any-pypredcalc-source: privilege
  immunity-from-spec-violating-duty: immunity
  decorate-every-realization: duty
  use-fraction-arithmetic-in-core: duty
  avoid-runtime-deps-in-core: duty
  return-witness-for-structural-claims: duty
  use-frozen-dataclasses: duty
  realize-from-corpus-before-coding: duty
  preserve-public-api-stability: duty
  maintain-subpackage-coherence: duty
provides-skill:
  - realizing-corpus-atom-as-python
  - verifying-priestley-correspondence
  - building-alexandrov-topology
  - working-with-transfinite-cell-complex
jurisdiction:
  read: [theories/.../predication-categories/, src/, tests/]
  write: [src/pypredcalc/topology/, tests/test_alexandrov.py, tests/test_priestley.py]
theory-basis: [office-as-double-settlement, jural-relation, normative-operational-layering]
---

# PyPredCalc Topology Specialist

The lab for `pypredcalc.topology`. Owns finite Alexandrov topologies, Priestley space
realizations, the bitopological / paired-Priestley apparatus, and the transfinite cell
complex stub.

## Subpackage scope

`src/pypredcalc/topology/` contains:

- `alexandrov.py` — Alexandrov topology on a finite poset.
- `priestley.py` — finite Priestley space (compact totally-order-disconnected ordered space).
- `transfinite_cell_complex.py` — transfinite cell complex (currently stub raising
  `NotImplementedError`).

## Realizations under this office

- `objects/alexandrov-topology` — already realized.
- `objects/priestley-space`, `objects/paired-priestley-space`,
  `objects/pairwise-stone-space` — partial / stub.
- `objects/q-enriched-transfinite-cellular-sheaf` carrier — pending the cell-complex stub.
- `theorems/closure-fixed-points-priestley-correspondence` — pending realization.
- `theorems/bitopological-stone-duality` — pending.

## Specialist duties

- [`maintain-subpackage-coherence`](../duties/maintain-subpackage-coherence.md) — every
  realized topology preserves the topological axioms (open-set closure under finite
  intersection and arbitrary union); Priestley spaces preserve total order
  disconnection.

## Specialist skills

- [`verifying-priestley-correspondence`](../skills/verifying-priestley-correspondence.md) —
  exhibits the duality `(D, ≤) ↔ (X(D), ≤, τ)` between bounded distributive lattices and
  Priestley spaces on a finite carrier.
- [`building-alexandrov-topology`](../skills/building-alexandrov-topology.md) — given a
  finite poset, constructs the Alexandrov open-set lattice (every up-set is open).
- [`working-with-transfinite-cell-complex`](../skills/working-with-transfinite-cell-complex.md) —
  scaffold for the transfinite-cell-complex stub when realization begins.

## Boundary with the lattice specialist

Priestley duality connects topology and lattice: the topology specialist owns Priestley
spaces; the lattice specialist owns frames and d-frames. The Priestley correspondence
realization will involve both.

## Incumbency

Currently held informally. Agent record at
[`pypredcalc-topology-specialist-agent`](../agents/pypredcalc-topology-specialist-agent.md).

Formal incumbency record: [`emsenn-incumbency`](../personnel/emsenn-incumbency.md) — captain holds this office informally pending substrate-driven dispatch.
