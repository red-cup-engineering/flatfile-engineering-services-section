---
title: "Realize q-enriched sheaf tensor product"
type: task
slug: realize-q-enriched-sheaf-tensor
status: done
horizon: soon
priority: 100
goal: realize-q-enriched-sheaf-module
requires-capability: working-with-q-enriched-sheaves
requires-brief: true
brief: work/briefs/q-enriched-sheaf-tensor.md
depends-on:
  - realize-q-enriched-sheaf-base-type
corpus-slug: objects/q-enriched-sheaf-tensor
created-at: "2026-05-08"
created-by: pypredcalc-records-officer
---

# Realize q-enriched sheaf tensor product

## Description

Realize the corpus object `objects/q-enriched-sheaf-tensor` —
$F \otimes G$ for two q-enriched sheaves over a common base, with
pointwise tensor of stalks followed by sheafification. For the
poset-indexed cellular case `pypredcalc.sheaf.q_enriched.QEnrichedSheaf`
ships, the cellular tensor is the per-cell quantale tensor of stalks
with the per-pair restriction-constant tensor.

## Theory grounding

Per `objects/q-enriched-sheaf-tensor`, for a Grothendieck site
$(\mathbf{T}, J)$ and Q-enriched presheaves $F, G$, the **pointwise
tensor presheaf** is

$$(F \otimes_{\mathrm{p}} G)(\sigma) := F(\sigma) \otimes_{\mathsf{Q}} G(\sigma)$$

with restrictions $f_\sigma^\tau \otimes g_\sigma^\tau$ (per-sheaf
restrictions tensored). The **sheaf tensor** is the sheafification.

For the cellular-poset realization:
- Stalks at each cell are single Q-elements.
- Restrictions are scalar multiplications.
- Per the corpus's `q-enriched-sheaf-closed-monoidal-structure`
  theorem, the tensor commutes with the cellular machinery.

## Acceptance

- [x] `pypredcalc.sheaf.q_enriched.tensor(F, G) -> QEnrichedSheaf`
      realising `objects/q-enriched-sheaf-tensor`.
- [x] Validation: `F` and `G` must share the same `quantale` and
      `base`; otherwise raise `ValueError`.
- [x] Per-cell stalks tensored: `(F ⊗ G).stalks[c] = F.stalks[c] ⊗_Q G.stalks[c]`.
- [x] Per-pair restriction constants tensored:
      `(F ⊗ G).restriction_constants[(p, c)] = F.restriction_constants[(p, c)] ⊗_Q G.restriction_constants[(p, c)]`.
- [x] Sheaf-condition witness for the result (since tensor of two
      consistent sheaves is consistent for scalar-multiplication
      restrictions on a commutative quantale).
- [x] Realization brief at `work/briefs/q-enriched-sheaf-tensor.md`
      written by the corpus-reader before dispatch.
- [x] Tests covering: tensor of constant sheaves; tensor with
      identity (Q's unit); shared-base / shared-quantale validation;
      sheaf-condition preservation.
- [x] `@realizes("objects/q-enriched-sheaf-tensor")` decoration.
- [x] Public API export.

## References

- Corpus: `objects/q-enriched-sheaf-tensor`,
  `theorems/q-enriched-sheaf-closed-monoidal-structure`.
- Goal: [`realize-q-enriched-sheaf-module`](../../goals/realize-q-enriched-sheaf-module.md).
- Depends on: [`realize-q-enriched-sheaf-base-type`](realize-q-enriched-sheaf-base-type.md) (done).
- Corresponding hom: [`realize-q-enriched-sheaf-hom`](realize-q-enriched-sheaf-hom.md).
