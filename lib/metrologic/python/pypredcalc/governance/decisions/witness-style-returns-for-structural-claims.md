---
title: "Witness-style returns for structural claims"
type: decision
slug: witness-style-returns-for-structural-claims
status: committed
date: "2026-05-08"
hard-core: witness-style-structural-returns-commitment
---

# Witness-style returns for structural claims

## What

When a function answers a predication-categorical claim that has structure — per-generator
data, per-cell discrepancies, before/after states, intermediate fibers — the function returns
a frozen-dataclass **witness**, not a bare `bool`.

Witness conventions:

- The class is `@dataclass(frozen=True)` and named `<Claim>Witness`
  (e.g., `NaturalityWitness`, `ClAlgebraWitness`, `BeckChevalleyWitness`).
- The witness has structural fields recording the evidence (per-cell maps, per-generator
  checks, per-(adjoint, fiber) records).
- The witness exposes `holds: bool` as a `@property` that reads off the structure.
- The witness implements `__bool__` returning `self.holds` so `if witness:` and
  `assert witness` work ergonomically.
- When the claim is compound, the witness records sub-checks as a tuple; failures are
  exposed via a `failures` or `discrepancy` property so callers can localize.

Floor-level predicates stay `bool`:

- Order primitives (`knowledge_leq`, `truth_leq`, `≤` on lattices/frames/posets).
- Set membership (`__contains__`).
- Python protocols (`__eq__`).
- Flat numerical predicates (`Matrix.is_square`, `is_quantifier_free`).

## Why

Two forces:

1. **The math demands it.** Predication-category theory computes in the categorical sense:
   the answer to a structural question is the categorical object that witnesses it, not a
   single bit. A bool collapses `∀f. f^*(v(p)) = v(q)` to a yes/no; the witness preserves
   the per-generator evidence the answer rests on. Downstream code can localise failures or
   build further structure on the witness.

2. **Composability.** Witnesses chain: a Cl-algebra witness can be converted into a
   Cl*-coalgebra witness via the corpus's algebra/coalgebra correspondence; a
   NaturalityWitness records evidence that downstream cohomological apparatus consumes.
   Bools cannot be chained that way without re-deriving the evidence each time.

The boundary at floor-level predicates avoids over-engineering: a partial-order comparison
between two values has no internal structure to witness. There the bool *is* the structure.

## Rules out

- Returning bare `bool` for a non-floor claim and providing a separate "discrepancy" function
  the caller has to call afterwards. The witness is one return; calls are not split.
- Returning a tuple `(holds: bool, evidence: ...)`. Tuple-returns lose typing and the witness
  type's invariants; use a `@dataclass`.
- Returning a witness that is mutable (`@dataclass(frozen=False)` or a regular class).
  Mutability breaks equality and hashing; witnesses are values.
- Mixing the witness pattern with the bool pattern at the same layer. A function either
  returns a witness or returns a bool; don't make the caller choose at call-site (e.g., via a
  `as_witness=True` flag).

## Does not constrain

- The shape of a particular witness's structural fields — that's the witness type's design,
  not a global convention.
- Whether the witness has `discrepancy`, `failures`, or some other localisation property.
  Choose what fits the claim's natural structure.
- Whether floor-level predicates return `bool` or a domain-specific value (e.g., a
  comparison enum). Predicates that *are* bools stay bools; predicates that are richer
  (e.g., a lattice comparison returning `<`, `=`, `>`, or `incomparable`) may use a
  domain-specific value type.
