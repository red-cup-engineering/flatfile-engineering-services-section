---
title: "Exact arithmetic only — Fraction, not float"
type: decision
slug: exact-arithmetic-only-fractions-not-floats
status: committed
date: "2026-05-08"
hard-core: pure-math-substrate-commitment
---

# Exact arithmetic only — Fraction, not float

## What

All arithmetic in the core (`src/pypredcalc/`) uses `fractions.Fraction` for rational
quantities and integer arithmetic for counting. No `float`, no `numpy.float64`, no implicit
floating-point conversion at any boundary inside the core.

The optional `[symbolic]` extra brings `sympy` for exact algebra beyond the rationals (e.g.,
Perron eigenvalues of substitution matrices). Sympy is *never* a hard dependency. Every core
function works without it; functions that genuinely need symbolic algebra are quarantined
in `_linalg` or modules that import sympy lazily and surface a clear `ImportError` with a
"`pip install pypredcalc[symbolic]`" hint when sympy is absent.

## Why

Predication-categorical constructions compute equalities (`x == y`), partial orders
(`x ≤_k y`, `x ≤_t y`), join/meet/fusion, and fixed points. Floating-point is a *lossy*
substrate:

- `0.1 + 0.2 != 0.3` collapses fixed-point detection.
- Lattice meet/join under floats produces non-associative, non-commutative behaviour at the
  ulp boundary.
- A bilattice value `(a, b)` with `a, b ∈ Q` computed via floats can drift across the diagonal
  axis that defines `≤_k` vs `≤_t` separation, silently inverting the answer.

Fractions are exact, hashable, comparable, support all the algebra the corpus calls for, and
have zero runtime dependencies. The performance cost (Fraction arithmetic is slower than
float arithmetic by a constant factor) is acceptable: the corpus's named examples are
finite-state and modest; performance is not the bottleneck.

The math-floor-for-substrates commitment (C4) makes this binding on downstream consumers.
PyFARS reading a Fraction and silently casting to float would corrupt the substrate it
imports from — silently. The exact-arithmetic constraint propagates.

## Rules out

- Using `float` for values that participate in lattice operations, fixed-point detection,
  or equality comparisons in the core.
- Importing `numpy` as a hard dependency. Numpy operates on float by default; the core does
  not need numpy and adopting it would either require careful Fraction-typed array work
  (defeats numpy) or accept floats (defeats this decision).
- Adding a "fast-mode" code path that uses floats for performance. The library's correctness
  surface is single — there is no fast path that yields the same answers as the slow path
  for the corpus's named examples.
- Sympy as a hard dependency. Tests that exercise sympy paths are gated behind a
  `pytest --runslow`-style marker or under the `[symbolic]` extra.

## Does not constrain

- Test-suite arithmetic. Property tests that generate input via `hypothesis` may use
  `float`-based generators if the test then converts to `Fraction` before exercising the
  core. The constraint is on what the core *computes with*, not what tests *generate*.
- External callers. PyPredCalc consumers (PyFARS, predicated-computing realizations) may use
  floats for their own purposes; pypredcalc's public API accepts `Fraction` (and `int` where
  meaningful) and returns `Fraction` (and `int`).
- Internal helpers that compute counts, lengths, or indices. Integer arithmetic is exact and
  is fine where the math calls for integers.
