---
title: "Realize q-enriched sheaf internal hom"
type: task
slug: realize-q-enriched-sheaf-hom
status: done
horizon: soon
priority: 100
goal: realize-q-enriched-sheaf-module
requires-capability: working-with-q-enriched-sheaves
requires-brief: true
brief: work/briefs/q-enriched-sheaf-hom.md
depends-on:
  - realize-q-enriched-sheaf-base-type
corpus-slug: objects/q-enriched-sheaf-hom
created-at: "2026-05-08"
created-by: pypredcalc-records-officer
---

# Realize q-enriched sheaf internal hom

## Description

Realize the corpus object `objects/q-enriched-sheaf-hom` — the
internal hom $\mathcal{H}om(F, G)$ in the closed monoidal category
of Q-enriched sheaves over a common base. Right adjoint to the
[tensor product](realize-q-enriched-sheaf-tensor.md).

## Theory grounding

Per `objects/q-enriched-sheaf-hom`, for Q-enriched presheaves
$F, G$, the **internal Hom presheaf** is

$$\mathcal{H}om_{\mathrm{p}}(F, G)(\sigma) := \mathrm{hom}_{\mathbf{Q\text{-}Cat}_{\mathrm{cwl}}}(F(\sigma), G(\sigma))$$

— the Q-category of Q-functors from $F(\sigma)$ to $G(\sigma)$. The
**internal Hom of sheaves** is the sheafification of this presheaf;
under suitable conditions (sufficient equalizers in $\mathbf{T}$),
sheafification is automatic.

For the cellular-poset realization where stalks are single
Q-elements: the internal Hom at cell $\sigma$ is the **residual**
$F(\sigma) \to G(\sigma)$ in the quantale — i.e.,
$G(\sigma) / F(\sigma)$ where `/` is the quantale's right residual
(the residual to fusion). This realises the per-cell Hom in
$\mathbf{Q\text{-}Cat}_{\mathrm{cwl}}$ as the residuated-lattice
residual.

The tensor-Hom adjunction (`q-enriched-sheaf-closed-monoidal-structure`):

$$\mathrm{Hom}_{\mathrm{Sh}}(F \otimes G, H) \cong \mathrm{Hom}_{\mathrm{Sh}}(F, \mathcal{H}om(G, H))$$

is the structural test for correctness on shared-base sheaves.

## Acceptance

- [x] `pypredcalc.sheaf.q_enriched.internal_hom(F, G) -> QEnrichedSheaf`
      realising `objects/q-enriched-sheaf-hom`.
- [x] Validation: same `quantale` and `base`.
- [x] Per-cell residual: `(hom F G).stalks[c] = F.stalks[c] -> G.stalks[c]`
      (the quantale's residual).
- [x] Per-pair restriction constants compose correctly under residual.
      Computed as `residuum(F[p]→G[p], F[c]→G[c])`. The cellular
      single-Q-element-stalk carrier cannot always express the
      result; when the residuum-derived data fails the sheaf
      condition, `SheafConditionError` is raised carrying the
      structured witness. See `work/briefs/q-enriched-sheaf-hom.md`
      for the analysis.
- [x] Sheaf-condition witness for the result.
- [x] Realization brief at `work/briefs/q-enriched-sheaf-hom.md` written.
- [x] Tests covering: `hom(F, F)` is the unit-stalked sheaf;
      tensor-hom adjunction on small examples (curry identity on
      stalks); sheaf-condition preservation; residual-of-bot and
      residual-of-top edge cases; carrier-inexpressivity failure on
      a Gödel-chain example.
- [x] `@realizes("objects/q-enriched-sheaf-hom")` decoration.
- [x] Public API export.

## References

- Corpus: `objects/q-enriched-sheaf-hom`,
  `theorems/q-enriched-sheaf-closed-monoidal-structure`,
  `theorems/q-enriched-verdier-hom-compatibility`.
- Goal: [`realize-q-enriched-sheaf-module`](../../goals/realize-q-enriched-sheaf-module.md).
- Depends on: [`realize-q-enriched-sheaf-base-type`](realize-q-enriched-sheaf-base-type.md) (done).
- Adjoint to: [`realize-q-enriched-sheaf-tensor`](realize-q-enriched-sheaf-tensor.md).
