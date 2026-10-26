---
title: "PyPredCalc Algebra Specialist"
type: office
slug: pypredcalc-algebra-specialist
scope: pypredcalc-algebra-subpackage
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
  - verifying-bilattice-axioms
  - verifying-residuation-laws
  - working-with-twist-product
jurisdiction:
  read: [theories/.../predication-categories/, src/, tests/]
  write: [src/pypredcalc/algebra/, tests/test_bilattice.py, tests/test_pre_bilattice.py, tests/test_twist_product.py, tests/test_residuated_lattice.py, tests/property/test_bilattice_laws.py, tests/property/test_residuation_adjunction.py]
theory-basis: [office-as-double-settlement, jural-relation, normative-operational-layering, formality-layer]
---

# PyPredCalc Algebra Specialist

The lab for `pypredcalc.algebra`. Owns realizations of the bilattice family — pre-bilattice,
bilattice, twist-product (Ginsberg's `L^⋈`), residuated lattice, and the corpus's algebraic
axioms over them.

## Subpackage scope

`src/pypredcalc/algebra/` contains:

- `bilattice.py` — Belnap four-valued bilattice (`BilatticeValue` enum, knowledge / truth
  joins and meets, negation).
- `pre_bilattice.py` — pre-bilattice axiom checker.
- `twist_product.py` — Ginsberg twist-product `L^⋈` over an arbitrary residuated lattice
  (the `TwistBilattice` dataclass).
- `residuated_lattice.py` — integral commutative residuated lattices with fusion `⊙` and
  right residual `⇒`.

## Realizations under this office

- `objects/bilattice` — Belnap bilattice.
- `objects/pre-bilattice` — pre-bilattice axioms.
- `objects/twist-product` — Ginsberg's `L^⋈`.
- `objects/residuated-lattice` — fusion + right residual.
- `morphisms/twist-product-fusion` — `⊙`.
- `morphisms/twist-product-right-residual` — `⇒`.
- `morphisms/negation` — `~` on the bilattice.

## Specialist duty

[`maintain-subpackage-coherence`](../duties/maintain-subpackage-coherence.md) — when adding
or modifying `algebra/`, the specialist must verify the change is coherent with the rest of
the subpackage's algebraic axioms (e.g., a new `TwistBilattice` operation must preserve the
interlacing laws; a new residuated-lattice element must preserve the adjunction
`a ⊙ b ≤ c ⇔ a ≤ b ⇒ c`).

## Specialist skills

- [`verifying-bilattice-axioms`](../skills/verifying-bilattice-axioms.md) — the four
  interlacing laws on a candidate `(L, ≤_k, ≤_t)`.
- [`verifying-residuation-laws`](../skills/verifying-residuation-laws.md) — the
  fusion/residual adjunction.
- [`working-with-twist-product`](../skills/working-with-twist-product.md) — building
  twist-product structures over a base residuated lattice.

## Boundary with other specialists

- **Predication specialist**: pypredcalc.predication imports algebra primitives.
  Algebra-side changes that would break predication-side use cases produce
  cross-subpackage friction; the specialist files an ADR-request triage note.
- **Lattice specialist**: lattices and bilattices are related but distinct. The lattice
  specialist owns frames and d-frames; the algebra specialist owns the bilattice family.

## Incumbency

Currently held informally. Agent record at
[`pypredcalc-algebra-specialist-agent`](../agents/pypredcalc-algebra-specialist-agent.md).

Formal incumbency record: [`emsenn-incumbency`](../personnel/emsenn-incumbency.md) — captain holds this office informally pending substrate-driven dispatch.
