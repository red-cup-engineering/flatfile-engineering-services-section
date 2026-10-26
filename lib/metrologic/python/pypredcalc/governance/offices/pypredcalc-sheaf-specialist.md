---
title: "PyPredCalc Sheaf Specialist"
type: office
slug: pypredcalc-sheaf-specialist
scope: pypredcalc-sheaf-subpackage
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
  - verifying-cohomology-functoriality
  - computing-cech-cohomology
  - working-with-frame-valued-sheaves
  - working-with-q-enriched-sheaves
jurisdiction:
  read: [theories/.../predication-categories/, src/, tests/]
  write: [src/pypredcalc/sheaf/, tests/test_cellular_sheaf.py, tests/test_frame_valued_sheaf.py]
theory-basis: [office-as-double-settlement, jural-relation, normative-operational-layering]
---

# PyPredCalc Sheaf Specialist

The lab for `pypredcalc.sheaf`. Owns sheaves: cellular sheaves on simplicial bases, constant
sheaves, frame-valued sheaves (where the value type is a `pypredcalc.lattice.PowersetFrame`
or `DFrame`), q-enriched sheaves (over a quantale), and the cohomology computations on them.

## Subpackage scope

`src/pypredcalc/sheaf/` contains:

- `cellular.py` — cellular sheaves on simplicial bases (partial; some
  `NotImplementedError` stubs).
- `cohomology.py` — Z-cohomology computations for cellular sheaves.
- `frame_valued.py` — frame-valued sheaves and their restriction maps.
- `q_enriched.py` — q-enriched / quantale-enriched (co)sheaves on cellular bases (stub).

## Realizations under this office

- `objects/d-frame-valued-sheaf` — pending full realization.
- `objects/q-enriched-sheaf-hom`, `objects/q-enriched-sheaf-tensor` — pending.
- `objects/q-enriched-cohomology` — pending.
- `objects/q-enriched-transfinite-cellular-sheaf` — pending.
- `objects/quantale-enriched-cosheaf` — pending.
- `morphisms/d-frame-morphism` (sheaf-side) — partial.
- Cohomology functoriality theorems — pending.

## Specialist duties

- [`maintain-subpackage-coherence`](../duties/maintain-subpackage-coherence.md) — sheaf
  conditions preserved (locality, gluing); cohomology functoriality preserved under
  base-change.

## Specialist skills

- [`verifying-cohomology-functoriality`](../skills/verifying-cohomology-functoriality.md) —
  given a sheaf and a base-change, exhibits that the cohomology computation respects the
  base-change.
- [`computing-cech-cohomology`](../skills/computing-cech-cohomology.md) — given a sheaf
  and a cover, computes Čech cohomology by direct chain-complex evaluation.
- [`working-with-frame-valued-sheaves`](../skills/working-with-frame-valued-sheaves.md) —
  building frame-valued sheaves over a cellular basis.
- [`working-with-q-enriched-sheaves`](../skills/working-with-q-enriched-sheaves.md) —
  building quantale-enriched sheaves and computing tensor / hom.

## Boundary with the lattice specialist

Frame-valued sheaves consume frames from `lattice/`. Frame-side changes that would break
sheaf-side use cases require coordination via triage note.

## Boundary with the predication specialist

The corpus's `predication-priestley-dual` and `inconsistency-sheaf` connect sheaves to
predication. Realizations spanning both subpackages coordinate via triage note.

## Incumbency

Currently held informally. Agent record at
[`pypredcalc-sheaf-specialist-agent`](../agents/pypredcalc-sheaf-specialist-agent.md).

Formal incumbency record: [`emsenn-incumbency`](../personnel/emsenn-incumbency.md) — captain holds this office informally pending substrate-driven dispatch.
