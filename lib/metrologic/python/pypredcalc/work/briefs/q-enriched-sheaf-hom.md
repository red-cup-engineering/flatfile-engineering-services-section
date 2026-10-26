---
title: "Realization brief — q-enriched sheaf internal hom"
type: brief
slug: q-enriched-sheaf-hom
status: active
horizon: now
corpus-slugs:
  - objects/q-enriched-sheaf-hom
realized-by:
  - src/pypredcalc/sheaf/q_enriched.py
serves-task: realize-q-enriched-sheaf-hom
serves-goal: realize-q-enriched-sheaf-module
created-at: "2026-05-09"
created-by: pypredcalc-corpus-reader
theory-basis:
  - objects/q-enriched-sheaf-hom
  - objects/q-enriched-sheaf-tensor
  - theorems/q-enriched-sheaf-closed-monoidal-structure
  - objects/quantale-enriched-sheaf
  - objects/residuated-lattice
---

# Realization brief — q-enriched sheaf internal hom

This brief documents the corpus reading behind the planned
`pypredcalc.sheaf.q_enriched.internal_hom(F, G) -> QEnrichedSheaf`
realization, the right adjoint to
[`tensor`](../../src/pypredcalc/sheaf/q_enriched.py) under the
[closed-monoidal structure](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/q-enriched-sheaf-closed-monoidal-structure.md).
It satisfies the `requires-brief: true` precondition on
[`realize-q-enriched-sheaf-hom`](../tasks/engineering/realize-q-enriched-sheaf-hom.md).

## What the corpus says

Per [`objects/q-enriched-sheaf-hom`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/q-enriched-sheaf-hom.md),
the **internal Hom presheaf** of two Q-enriched presheaves $F, G$ is

$$\mathcal{H}om_{\mathrm{p}}(F, G)(\sigma) := \mathrm{hom}_{\mathbf{Q\text{-}Cat}_{\mathrm{cwl}}}(F(\sigma), G(\sigma))$$

with restrictions induced by precomposition / postcomposition with
the per-sheaf restrictions of $F$ and $G$. The internal Hom of
sheaves is the sheafification — automatic when the value category has
sufficient equalizers.

The closed-monoidal-structure theorem establishes the adjunction

$$\mathrm{Hom}_{\mathrm{Sh}}(F \otimes G, H) \cong \mathrm{Hom}_{\mathrm{Sh}}(F, \mathcal{H}om(G, H))$$

with internal Hom right adjoint to tensor in each variable.

## What the realization will ship

The realization specializes to the same poset-indexed
scalar-multiplication setting as the existing `QEnrichedSheaf` and
`tensor`:

- `internal_hom(F, G)` requires `F.quantale is G.quantale` and
  `F.base is G.base` (object identity).
- Per-cell stalks are quantale **residuums**:
  `(internal_hom F G).stalks[c] = quantale.residuum(F.stalks[c], G.stalks[c])`.
- Per-pair restriction constants are residuums of the per-cell hom
  values:

  ```
  c_H = quantale.residuum(F[p]→G[p],  F[c]→G[c])
  ```

  — the largest scalar $r$ such that $r \otimes (F[p]\to G[p]) \le (F[c]\to G[c])$.

- Sheaf-condition validation runs on construction. If equality fails
  for some pair, `SheafConditionError` is raised.

The single-Q-element-stalk specialization is what justifies the
stalks-as-residuum formula: a Q-functor between two Q-categories
with single-element underlying sets is determined by its weighted-Q-hom
value, which in $\mathbf{Q\text{-}Cat}_{\mathrm{cwl}}$ for single-element
stalks reduces to the residuum.

## Why the residuum is the right per-cell value

The per-cell hom in $\mathbf{Q\text{-}Cat}_{\mathrm{cwl}}$ is the
internal Hom of complete weighted lattices. For single-Q-element
stalks $a, b \in \mathsf{Q}$, viewed as $\mathsf{Q}$-categories with
unique objects, the Q-Cat internal Hom collapses to the residuum
$a \to b$ — the largest $x \in \mathsf{Q}$ such that $a \otimes x \le b$.
This is the exact data of "how much of $b$ is reachable from $a$ via
the Q-action" — the Q-enriched analogue of "implication."

## When the cellular carrier can / cannot express the result

The `QEnrichedSheaf` carrier requires restrictions to be
*scalar multiplications*. The pointwise hom presheaf has the
*correct restriction structure abstractly* — induced from $F$'s and
$G$'s restrictions — but its expression as a scalar-multiplication
sheaf depends on whether the relevant scalar exists in $\mathsf{Q}$.

**Inequality always holds.** For $\alpha = c_F$, $\beta = c_G$:

$$(\alpha \to \beta) \otimes (a \to b) \;\le\; (\alpha \otimes a) \to (\beta \otimes b)$$

Proof: $\alpha \otimes (\alpha \to \beta) \le \beta$ and
$a \otimes (a \to b) \le b$, so by commutativity / monotonicity
$(\alpha \otimes a) \otimes ((\alpha \to \beta) \otimes (a \to b)) \le \beta \otimes b$.
Residuating gives the claim.

**Equality is the question.** The cellular hom asks for a *scalar* $r$
such that $r \otimes (F[p] \to G[p]) = (F[c] \to G[c])$ exactly. The
construction $r := \mathrm{residuum}(F[p] \to G[p], F[c] \to G[c])$
gives the largest scalar with $r \otimes (F[p] \to G[p]) \le (F[c] \to G[c])$.
Equality holds iff there exists *some* scalar witnessing the upper
bound — a property of the specific quantale and stalks.

**Worked failure case (Gödel chain).** Take $\mathsf{Q} = \{0, h, t\}$
(Gödel: $\otimes = \wedge$, $a \to b = t$ if $a \le b$ else $b$),
with $\alpha = h$, $\beta = t$, $a = t$, $b = h$:

- $F[p] = t$, $G[p] = h$; $F[c] = h \wedge t = h$, $G[c] = t \wedge h = h$.
- $F[p] \to G[p] = t \to h = h$.
- $F[c] \to G[c] = h \to h = t$.
- Need $r \otimes h = t$, but $r \wedge h \le h < t$. **No solution.**

The realization raises `SheafConditionError` here. This is honest:
the *general* corpus internal Hom exists (sheafification produces a
sheaf in $\mathbf{Q\text{-}Cat}_{\mathrm{cwl}}$), but our cellular
single-Q-element-stalk shape cannot express the result. Lifting the
carrier beyond single Q-elements is the long-term resolution; until
then, callers see a structured witness.

For Boolean and many practical chain quantales, equality holds in
all cases checked — see test suite for the BOOL surface.

## Load-bearing dependencies

- [`pypredcalc.sheaf.q_enriched.QEnrichedSheaf`](../../src/pypredcalc/sheaf/q_enriched.py) — input and output carrier.
- [`pypredcalc.algebra.residuated_lattice.ResiduatedLattice.residuum`](../../src/pypredcalc/algebra/residuated_lattice.py) — the per-cell hom value and the per-pair restriction-constant computation.

## Public API surface

- `internal_hom(F: QEnrichedSheaf[Q], G: QEnrichedSheaf[Q]) -> QEnrichedSheaf[Q]`,
  decorated `@realizes("objects/q-enriched-sheaf-hom")`.
- Exported from `pypredcalc.sheaf.q_enriched` and re-exported from
  `pypredcalc.sheaf.__init__`.

## Validation surface

- Shared quantale: `F.quantale is G.quantale` (object identity).
- Shared base: `F.base is G.base` (object identity).
- Mismatch raises `ValueError`.
- Sheaf-condition failure on the residuum-derived data raises
  `SheafConditionError` carrying the structured witness — i.e.
  the cellular carrier cannot express this internal hom.

## Witness-style discipline (charter C3)

Two distinct failure modes return structured information:

- **Carrier mismatch** (different quantale or base): `ValueError` —
  this is a programmer error, not a math claim.
- **Carrier inexpressivity** (sheaf condition fails on residuum-derived
  data): `SheafConditionError` with `.witness` — this is a math claim
  that the inputs lie outside the cellular carrier's expressive range.

## What this realization is *not*

- **Not** the general Grothendieck-site / Q-Cat internal Hom — it is
  the cellular single-Q-element-stalk specialization.
- **Not** the d-frame internal hom — that lives downstream when the
  d-frame value category is realized.
- **Not** a proof of the tensor-hom adjunction — that is a
  *theorem-level* binding (`theorems/q-enriched-sheaf-closed-monoidal-structure`)
  that ships as property tests over the surface, not as a constructed
  isomorphism.
- **Not** a sheafifying internal hom — when the residuum-derived data
  fails the sheaf condition, the realization raises rather than
  silently sheafifying. Sheafification of cellular Q-enriched sheaves
  is a separate, harder problem that requires lifting the carrier.

## Stability tier

Provisional. The shape will lift when stalks lift beyond single
Q-elements (so internal hom can express more residual structure),
and when the cellular base lifts to a Grothendieck site (so
sheafification becomes meaningful).

## Open questions for the corpus

- **Sheafification for cellular hom failures.** In the cellular
  carrier, "internal hom does not exist as a cellular sheaf" is a
  real outcome. The corpus's general sheafification handles this by
  enlarging the value category. What is the right cellular
  specialization of sheafification?
- **Quantale-class boundary.** For which finite commutative integral
  quantales is the cellular internal hom always a scalar-multiplication
  sheaf? Boolean and "trivial restriction" cases work; Gödel chains
  fail in general. Identifying the boundary class is a math question.
