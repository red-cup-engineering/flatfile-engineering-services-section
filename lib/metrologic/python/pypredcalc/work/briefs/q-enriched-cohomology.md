---
title: "Realization brief — q-enriched Čech cohomology"
type: brief
slug: q-enriched-cohomology
status: active
horizon: now
corpus-slugs:
  - objects/q-enriched-cohomology
realized-by:
  - src/pypredcalc/sheaf/q_enriched.py
serves-task: realize-q-enriched-cohomology
serves-goal: realize-q-enriched-sheaf-module
created-at: "2026-05-10"
created-by: pypredcalc-corpus-reader
theory-basis:
  - objects/q-enriched-cohomology
  - theorems/q-enriched-cohomology-higher-degree-vanishing
  - objects/quantale-enriched-sheaf
  - objects/residuated-lattice
---

# Realization brief — q-enriched Čech cohomology

This brief documents the corpus reading behind the planned
`pypredcalc.sheaf.q_enriched.cohomology(F, degree) -> CohomologyWitness[Q]`
realization. It satisfies the `requires-brief: true` precondition on
[`realize-q-enriched-cohomology`](../tasks/engineering/realize-q-enriched-cohomology.md).

## What the corpus says

Per [`objects/q-enriched-cohomology`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/q-enriched-cohomology.md),
the **Q-enriched Čech cohomology** $H^n_{\mathsf{Q}}(\mathbf{T}, J; F)$ is defined via the
standard cochain-complex construction:

- $C^n F = \prod_{\sigma \in \mathbf{T}_n} F(\sigma) \in \mathbf{Q\text{-}Cat}_{\mathrm{cwl}}$,
  where $\mathbf{T}_n$ = the $n$-dimensional objects of $\mathbf{T}$ (length-$n+1$ chains
  in the poset base).
- $\delta^n: C^n F \to C^{n+1} F$ is the coboundary, where for each $(n+1)$-chain
  $\tau$ with face structure $\{\sigma_0, \ldots, \sigma_k\}$:
  $(\delta^n x)(\tau) = \bigwedge^W_{i=0}^k F(\sigma_i \to \tau)^*(x(\sigma_i))$.
- $H^n_{\mathsf{Q}} = \ker(\delta^n) / \mathrm{im}(\delta^{n-1})$, computed in the
  Q-enriched sense.

**Degree-0 specialization.** The corpus identifies $H^0_{\mathsf{Q}} \cong \mathrm{Fix}(L)$,
the fixed points of the Lawvere Laplacian $L$. For our scalar-mult cellular sheaves,
this collapses to: a 0-cochain $x: P \to Q$ is a global section iff
$c_{pc} \otimes x(p) = x(c)$ for every comparable pair $(p, c)$. The unique valid
global section is the stalk tuple itself (enforced at construction). The Q-element
representing this section's "information content" is the quantale meet over all stalks:

$$H^0(F) = \bigwedge_{c \in P} F(c) = \bigwedge_{c \in P} \text{stalks}[c].$$

**Higher-degree specialization.** By
[`theorems/q-enriched-cohomology-higher-degree-vanishing`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/q-enriched-cohomology-higher-degree-vanishing.md),
$H^n_{\mathsf{Q}} = 0$ for $n \geq 2$ on the bitopological settling site (the corpus's
primary sheaf domain). For $H^1$: any valid `QEnrichedSheaf` enforces the sheaf
condition at construction, which is precisely the condition that every 1-cocycle is a
1-coboundary — so $H^1(F) = \top$ (trivial obstruction, no gluing failures). Together
these give $H^n = \top$ for all $n \geq 1$.

## What the realization will ship

The realization specializes to the same poset-indexed scalar-mult setting as the
existing `QEnrichedSheaf`, `tensor`, and `internal_hom`:

- `cohomology(F, degree, *, cover=None) -> CohomologyWitness[Q]`
  decorated `@realizes("objects/q-enriched-cohomology")`.
- `cover` defaults to `None` (= the natural cover implicit in the cellular base's
  incidence structure). No `CoveringFamily` type is introduced at this stage; the
  parameter is present for future extensibility.

`CohomologyWitness[Q]` carries per-degree computation data:

- `degree: int` — the cohomological degree.
- `value: Q` — the resulting Q-element ($H^n$ as a Q-element).
- `chains: tuple[tuple[Hashable, ...], ...]` — the $n$-chains (degree-$n$ cells).
- `chain_values: tuple[Q, ...]` — the Q-value at each chain (stalks for degree 0,
  $\top$ for higher degrees).

## Degree-0 algorithm

The $n$-chains at degree 0 are the 1-element chains: each poset element. The
chain_values are the corresponding stalks. The cohomology value is their meet:

```python
chains = F.base.chains(1)       # [(c,) for c in P]
chain_values = [F.stalks[c[0]] for c in chains]
value = reduce(quantale.meet, chain_values, quantale.unit)  # ⊤ if no chains
```

**Empty-base case.** $\bigwedge \emptyset = \top$ (vacuous meet = quantale unit).
Realized by initializing `value = quantale.unit` and taking the meet only when
`chain_values` is non-empty.

**Constant sheaf.** All stalks equal $q$ ⟹ meet = $q$ ⟹ $H^0 = q$. ✓

**Bottom-stalk sheaf.** Any stalk at $\bot$ ⟹ meet = $\bot$ ⟹ $H^0 = \bot$.
This is what the task spec means by "inconsistent (would-be) sheaf is appropriately
bottom" — a valid sheaf whose stalks include the quantale bottom (0 in Boolean,
$\bot$ in the chain) has $H^0 = \bot$.

## Degree ≥ 1 algorithm

For $n \geq 1$: `chains = F.base.chains(n + 1)` and `value = quantale.unit` ($\top$).
Chain_values are all $\top$. The witness records the chains for inspectability.

**Why ⊤ and not some other element.** In the Q-enriched setting, "trivial cohomology"
= "no obstruction" = the quantale's multiplicative unit $\top$. The vanishing theorem
says $H^n = 0$ in the additive sense (trivial group); in Q, "trivial" = $\top$
because $\top$ is the identity for $\otimes$ (integrality of the quantale) and the
"tautologically consistent" value.

## Why the meet is the right H^0 formula

A Q-enriched global section is a single $Q$-element "visible across all cells."
For single-Q-element stalks with scalar-mult restrictions, the unique consistent
0-cochain is the stalk tuple. The Q-functor collapsing this to a single element is the
limit (meet) in $\mathsf{Q}$: the largest $q \in Q$ such that $q \leq \text{stalks}[c]$
for every cell $c$. This is the standard formula for the weight of the global sections
object in a $\mathsf{Q}$-enriched setting.

## Cover parameter scope

The `cover=None` default pins the covering family to the cellular base's full incidence
structure (the posetal cover). A non-trivial covering family would specify a
sub-collection of the poset's downsets as the opens; the Čech complex would then be
built from those opens' intersections rather than from all chains. That generalization
is deferred until a `CoveringFamily` type exists. Callers that pass a non-None `cover`
now receive a `NotImplementedError`.

## Load-bearing dependencies

- [`pypredcalc.sheaf.q_enriched.QEnrichedSheaf`](../../src/pypredcalc/sheaf/q_enriched.py) — input carrier.
- [`pypredcalc.combinatorics.poset.Poset.chains(n)`](../../src/pypredcalc/combinatorics/poset.py) — enumerates all
  strictly-ascending chains of length $n$; used to build $C^n F$.
- [`pypredcalc.algebra.residuated_lattice.ResiduatedLattice.meet`](../../src/pypredcalc/algebra/residuated_lattice.py) — quantale meet for the $H^0$ formula.

## Public API surface

- `CohomologyWitness[Q]` — witness type; exported from `pypredcalc.sheaf.q_enriched`
  and re-exported from `pypredcalc.sheaf`.
- `cohomology(F, degree, *, cover=None) -> CohomologyWitness[Q]` — decorated
  `@realizes("objects/q-enriched-cohomology")`; same export chain.

## Witness-style discipline (charter C3)

One structural failure mode: `degree < 0`. This is a programmer error, not a math
claim; `ValueError` is appropriate.

The returned `CohomologyWitness` is the structural object — `value` is the cohomology
Q-element, `chains` and `chain_values` are the computation trace. Property tests can
assert coherence across the witness fields without collapsing to `value` alone.

## What this realization is *not*

- **Not** the general Grothendieck-site cohomology — it is the cellular
  single-Q-element-stalk specialization.
- **Not** presheaf cohomology — the input must be a valid `QEnrichedSheaf` (sheaf
  condition enforced). The "bottom sheaf" test case is a valid sheaf whose stalks
  happen to include the quantale bottom.
- **Not** a proof of the vanishing theorem — the $H^n = \top$ result for $n \geq 1$
  is asserted on the basis of `theorems/q-enriched-cohomology-higher-degree-vanishing`;
  the proof is in the corpus, not in this module.
- **Not** derived-functor cohomology — the cochain-level $H^n$ realized here agrees
  with derived-functor $R^n \Gamma$ only in the Boolean d-frame scope (per the corpus).

## Stability tier

Provisional. The degree-0 formula lifts when stalks lift beyond single Q-elements.
The degree ≥ 1 path lifts when a non-trivial `CoveringFamily` type exists and when the
cellular carrier can express non-trivial cocycles.

## Open questions for the corpus

- **Non-trivial H^1 in the cellular scalar-mult setting.** Are there cellular
  scalar-mult sheaves on non-trivial covers (not the full poset cover) where $H^1 \neq \top$?
  If so, that would require the `CoveringFamily` generalization to expose.
- **H^0 on presheaves.** Should the function accept presheaf data (stalks and
  restrictions not satisfying the sheaf condition exactly) and report the "actual"
  global sections Q-element (which might differ from the stalk meet)? This would
  require lifting the input type.
