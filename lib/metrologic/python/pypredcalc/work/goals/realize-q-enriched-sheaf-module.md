---
title: "Realize q-enriched sheaf module"
type: goal
slug: realize-q-enriched-sheaf-module
status: met
horizon: done
met-at: "2026-05-10"
theory-basis:
  - objects/q-enriched-sheaf-hom
  - objects/q-enriched-sheaf-tensor
  - objects/q-enriched-cohomology
  - objects/q-enriched-transfinite-cellular-sheaf
  - objects/quantale-enriched-cosheaf
owner-office: pypredcalc-sheaf-specialist
tasks:
  - realize-q-enriched-sheaf-base-type
  - realize-q-enriched-sheaf-tensor
  - realize-q-enriched-sheaf-hom
  - realize-q-enriched-cohomology
---

# Realize q-enriched sheaf module

The `pypredcalc.sheaf.q_enriched` module is currently a stub. The corpus carries five
related objects naming q-enriched (quantale-enriched) sheaf-theoretic structures; this
goal replaces the stub with progressive realizations.

## Theory grounding

Quantale-enriched (q-enriched) sheaves are sheaves whose value type is a complete unital
integral residuated lattice — a quantale `Q`. Each cell carries a `Q`-valued
"presheaf-degree" and restriction maps preserve the `Q`-action. The corpus uses these
for cohomology classes that take values in a quantale rather than just `Z` or a frame.

The five corpus objects this goal targets:

- `q-enriched-sheaf-hom` — the internal hom of q-enriched sheaves.
- `q-enriched-sheaf-tensor` — the tensor product, with `Q`-action.
- `q-enriched-cohomology` — `Q`-valued cohomology computed via the Čech complex.
- `q-enriched-transfinite-cellular-sheaf` — q-enriched sheaves on transfinite cell
  complexes; depends on the transfinite-cell-complex module.
- `quantale-enriched-cosheaf` — the dual; cosheaves with `Q`-action.

## Acceptance

All four sub-tasks complete:

- [x] **Base type** — `QEnrichedSheaf(quantale, base, sections, restriction_maps)`,
      with sheaf-condition verification (locality + gluing, both `Q`-valued).
      Done as [`realize-q-enriched-sheaf-base-type`](../tasks/engineering/realize-q-enriched-sheaf-base-type.md).
- [x] **Tensor product** — `tensor(F, G)` returning a new q-enriched sheaf with
      `Q`-action. Done as
      [`realize-q-enriched-sheaf-tensor`](../tasks/engineering/realize-q-enriched-sheaf-tensor.md).
- [x] **Internal hom** — `hom(F, G)` returning a new q-enriched sheaf computing
      pointwise residual. Done as
      [`realize-q-enriched-sheaf-hom`](../tasks/engineering/realize-q-enriched-sheaf-hom.md).
- [x] **Cohomology** — `cohomology(F, degree)` computing `Q`-valued Čech cohomology.
      Done as [`realize-q-enriched-cohomology`](../tasks/engineering/realize-q-enriched-cohomology.md).

Q-enriched-transfinite-cellular-sheaf is deferred to a follow-up goal blocked on the
transfinite-cell-complex module. Quantale-enriched-cosheaf is deferred to a follow-up
goal once the base + tensor + hom are stable.

## Owner

[`pypredcalc-sheaf-specialist`](../../governance/offices/pypredcalc-sheaf-specialist.md).

## Resolution

All four tasks landed in `pypredcalc.sheaf.q_enriched`. Public API:
`QEnrichedSheaf`, `tensor`, `internal_hom`, `cohomology`, `CohomologyWitness`,
plus the sheaf-condition helpers. 26 new tests cover cohomology; full suite 786
tests passing as of 2026-05-10.

`q-enriched-transfinite-cellular-sheaf` and `quantale-enriched-cosheaf` remain
deferred to follow-up goals (blocked on the transfinite-cell-complex module and
requiring a stable cosheaf carrier respectively).
