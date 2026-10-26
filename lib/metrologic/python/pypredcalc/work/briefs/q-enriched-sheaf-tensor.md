---
title: "Realization brief — q-enriched sheaf tensor"
type: brief
slug: q-enriched-sheaf-tensor
status: active
horizon: now
corpus-slugs:
  - objects/q-enriched-sheaf-tensor
realized-by:
  - src/pypredcalc/sheaf/q_enriched.py
serves-task: realize-q-enriched-sheaf-tensor
serves-goal: realize-q-enriched-sheaf-module
created-at: "2026-05-09"
created-by: pypredcalc-corpus-reader
theory-basis:
  - objects/q-enriched-sheaf-tensor
  - theorems/q-enriched-sheaf-closed-monoidal-structure
  - objects/quantale-enriched-sheaf
---

# Realization brief — q-enriched sheaf tensor

This brief documents the corpus reading behind the planned
`pypredcalc.sheaf.q_enriched.tensor(F, G) -> QEnrichedSheaf`
realization, which extends the `QEnrichedSheaf` carrier shipped under
the [`q-enriched-sheaf-base`](q-enriched-sheaf-base.md) brief. It
satisfies the `requires-brief: true` precondition on
[`realize-q-enriched-sheaf-tensor`](../tasks/engineering/realize-q-enriched-sheaf-tensor.md).

## What the corpus says

Per [`objects/q-enriched-sheaf-tensor`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/q-enriched-sheaf-tensor.md),
for a commutative unital quantale $\mathsf{Q}$ and a Grothendieck site
$(\mathbf{T}, J)$, the **pointwise tensor presheaf** of two Q-enriched
presheaves $F, G : \mathbf{T}^{\mathrm{op}} \to \mathbf{Q\text{-}Cat}_{\mathrm{cwl}}$
is

$$(F \otimes_{\mathrm{p}} G)(\sigma) := F(\sigma) \otimes_{\mathsf{Q}} G(\sigma)$$

with restrictions $f_\sigma^\tau \otimes g_\sigma^\tau$ — the per-sheaf
restriction Q-functors tensored. The **sheaf tensor** is the
sheafification:

$$F \otimes G \;:=\; \mathrm{sheafify}_J(F \otimes_{\mathrm{p}} G).$$

The accompanying [`theorems/q-enriched-sheaf-closed-monoidal-structure`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/q-enriched-sheaf-closed-monoidal-structure.md)
establishes that $\otimes$ together with internal Hom makes
$\mathrm{Sh}(\mathbf{T}, J; \mathsf{Q})$ symmetric monoidal closed,
with monoidal unit $\mathbf{1}_J$ — the constant Q-enriched sheaf with
stalk $\mathbf{1}_{\mathsf{Q}}$ at every cell.

The corpus also names a **cellular tensor** specialization
(`objects/q-enriched-sheaf-tensor` §"Cellular tensor"): for a
fibered cellular site, tensor decomposes per fiber as the per-fiber
tensor of cellular Q-enriched sheaves — the operation commutes with
the cellular machinery.

## What the realization will ship

The realization specializes to the same poset-indexed cellular case
shipped by `QEnrichedSheaf`:

- $F$ and $G$ share a common `quantale: ResiduatedLattice[Q]` and a
  common `base: Poset`.
- $F \otimes G$ is a `QEnrichedSheaf` over the same quantale and the
  same base.
- Stalks at each cell are tensored as Q-elements:
  `(F ⊗ G).stalks[c] = quantale.tensor(F.stalks[c], G.stalks[c])`.
- Restriction constants at each comparable pair are tensored:
  `(F ⊗ G).restriction_constants[(p, c)] =
   quantale.tensor(F.restriction_constants[(p, c)],
                   G.restriction_constants[(p, c)])`.

For this poset-indexed scalar-multiplication setting, the
sheafification step is *identity*: the pointwise tensor of two
sheaf-conforming sheaves is already a sheaf. We prove this below.

## Why no sheafification step is required

The cellular sheaf condition for `QEnrichedSheaf` reduces to: for
every comparable pair $(\mathrm{parent}, \mathrm{child})$ with
constant $c$, $c \otimes \mathrm{stalk}[\mathrm{parent}] = \mathrm{stalk}[\mathrm{child}]$.

For $F$, $G$ both satisfying this, with tensor data
$c := c_F \otimes c_G$, $s[\mathrm{parent}] :=
s_F[\mathrm{parent}] \otimes s_G[\mathrm{parent}]$,
$s[\mathrm{child}] := s_F[\mathrm{child}] \otimes s_G[\mathrm{child}]$:

$$c \otimes s[\mathrm{parent}]
  = (c_F \otimes c_G) \otimes (s_F[\mathrm{parent}] \otimes s_G[\mathrm{parent}])$$

By commutativity and associativity of $\otimes$ on a commutative
quantale:

$$= (c_F \otimes s_F[\mathrm{parent}]) \otimes (c_G \otimes s_G[\mathrm{parent}])
  = s_F[\mathrm{child}] \otimes s_G[\mathrm{child}]
  = s[\mathrm{child}].$$

So the pointwise tensor already satisfies the cellular sheaf
condition; sheafification is the identity. This matches the corpus's
"the tensor commutes with the fiber-cellular machinery" claim
specialized to this setting.

## Load-bearing dependencies

- [`pypredcalc.sheaf.q_enriched.QEnrichedSheaf`](../../src/pypredcalc/sheaf/q_enriched.py) —
  the input and output value-bearing class.
- [`pypredcalc.algebra.residuated_lattice.ResiduatedLattice.tensor`](../../src/pypredcalc/algebra/residuated_lattice.py) —
  the per-cell tensor operation. The `ResiduatedLattice` carrier is
  validated commutative and associative on construction.

## Validation surface

- **Shared quantale.** `F.quantale is G.quantale` (object identity,
  not value equality). Quantales carry callable functions in their
  data, so equality on `ResiduatedLattice` is identity-based;
  identity is the right relation here.
- **Shared base.** `F.base is G.base` (object identity), for the same
  reason — `Poset` carries a callable `leq`. Identity-based sharing
  matches how callers compose against this surface.
- Both are `ValueError` on mismatch, as the task acceptance specifies.

## Public API surface

- `tensor(F: QEnrichedSheaf[Q], G: QEnrichedSheaf[Q]) -> QEnrichedSheaf[Q]`,
  decorated `@realizes("objects/q-enriched-sheaf-tensor")`.
- Exported from `pypredcalc.sheaf.q_enriched` and re-exported from
  `pypredcalc.sheaf.__init__`.

## What this realization is *not*

- **Not** the general Grothendieck-site sheaf tensor — it is the
  cellular specialization where sheafification collapses to identity.
- **Not** the d-frame-valued tensor specialization — that lives
  downstream when the d-frame value-category surface is realized.
- **Not** the closed-monoidal *adjunction* with internal Hom — that
  composes once `realize-q-enriched-sheaf-hom` lands.
- **Not** a constant-sheaf factory: the corpus's monoidal unit
  $\mathbf{1}_J$ requires constructing the constant sheaf with stalk
  $\mathbf{1}_{\mathsf{Q}}$ at every cell. Callers can build that
  directly via `QEnrichedSheaf(...)`; if a `unit_sheaf(quantale, base)`
  helper is wanted, file it as a separate task.

## Witness-style discipline (charter C3)

The constructor of the result `QEnrichedSheaf` re-runs
`check_sheaf_condition` on the tensored data. Since the proof above
shows the condition holds whenever the inputs are valid, this check
is structural insurance — a violation indicates either a bug in the
quantale's tensor or a non-commutative quantale slipping through
construction-time validation. The structured `SheafConditionWitness`
remains available on the constructed result for callers who want to
inspect.

## Stability tier

Provisional (per
[`public-api-stability-tiers`](../../governance/specifications/public-api-stability-tiers.md)
pre-1.0 default). The shape will lift when stalks lift beyond single
Q-elements; until then the per-cell-tensor / per-pair-tensor formula
is the operative definition.

## Open questions for the corpus

- **Sheafification beyond the cellular case.** The proof above is
  specific to the scalar-multiplication / single-Q-element setting.
  For richer stalks (complete weighted lattices), the sheafification
  step is non-trivial; flagging for the time `q-enriched-sheaf-base`
  lifts beyond single-Q-element stalks.
- **Unit-sheaf factory.** Whether `unit_sheaf(quantale, base)` should
  ship alongside `tensor` is an API-shape question, not a
  mathematical one — filing as a follow-up question rather than
  bundling into this task.
