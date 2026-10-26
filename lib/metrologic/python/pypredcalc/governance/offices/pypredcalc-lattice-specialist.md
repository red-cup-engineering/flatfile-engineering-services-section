---
title: "PyPredCalc Lattice Specialist"
type: office
slug: pypredcalc-lattice-specialist
scope: pypredcalc-lattice-subpackage
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
  - verifying-frame-laws
  - computing-d-frame-restriction
  - working-with-frame-morphisms
jurisdiction:
  read: [theories/.../predication-categories/, src/, tests/]
  write: [src/pypredcalc/lattice/, tests/test_frame.py, tests/test_dframe.py, tests/property/test_frame_morphism_preservation.py]
theory-basis: [office-as-double-settlement, jural-relation, normative-operational-layering]
---

# PyPredCalc Lattice Specialist

The lab for `pypredcalc.lattice`. Owns frames (complete Heyting algebras with arbitrary
joins distributing over finite meets), frame morphisms, powerset frames, d-frames
(double-frames carrying both a positive and a negative information frame), and the
restriction operations on them.

## Subpackage scope

`src/pypredcalc/lattice/` contains realizations of:

- Frames and frame morphisms (`PowersetFrame`, `FrameMorphism`).
- D-frames (`DFrame`) — the corpus's bitopological-information-frame structure.
- Settling-d-frame restriction (`settling_dframe_at_clopen`, `restrict_with`).

## Realizations under this office

- `objects/d-frame` — the corpus's d-frame.
- `morphisms/d-frame-morphism` — d-frame homomorphisms.
- Frame-side machinery the corpus uses but does not name as its own atom.

## Specialist duties

- [`maintain-subpackage-coherence`](../duties/maintain-subpackage-coherence.md) — frame
  axioms preserved under modification: arbitrary joins exist, finite meets distribute
  over them, the Heyting implication adjoint exists.

## Specialist skills

- [`verifying-frame-laws`](../skills/verifying-frame-laws.md) — checks the frame axioms
  on a candidate `(L, ⊓, ⨆)` with implication.
- [`computing-d-frame-restriction`](../skills/computing-d-frame-restriction.md) — given a
  d-frame and a clopen, produces the restriction d-frame.
- [`working-with-frame-morphisms`](../skills/working-with-frame-morphisms.md) — building
  morphisms that preserve `⊓` and `⨆`, checking preservation laws.

## Boundary with the topology specialist

Stone / Priestley duality connects topology to lattices. The topology specialist owns the
spatial side; the lattice specialist owns the algebraic side. Realizations spanning both
(e.g., the Priestley correspondence) coordinate via cross-subpackage triage notes.

## Boundary with the sheaf specialist

The sheaf specialist owns frame-valued sheaves (which take frames from this subpackage as
their value-domain). Frame-side changes that would break sheaf-side use cases produce
cross-subpackage friction.

## Incumbency

Currently held informally. Agent record at
[`pypredcalc-lattice-specialist-agent`](../agents/pypredcalc-lattice-specialist-agent.md).

Formal incumbency record: [`emsenn-incumbency`](../personnel/emsenn-incumbency.md) — captain holds this office informally pending substrate-driven dispatch.
