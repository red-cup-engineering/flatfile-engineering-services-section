---
title: "Use Fraction arithmetic in core"
type: jural-relation
kind: duty
slug: use-fraction-arithmetic-in-core
active-holder: pypredcalc-developer
passive-party: pypredcalc-community
scope-action: write-arithmetic-code
triggering-powers: [write-pypredcalc-source]
required-action: use-fractions-Fraction-not-float
enforcement: substrate-violation
hard-core: pure-math-substrate-commitment
rule-type: N→N
theory-basis: [jural-relation, normative-operational-layering, charter-as-closure-system]
---

# Use Fraction arithmetic in core

All arithmetic in `src/pypredcalc/` uses `fractions.Fraction` for rational quantities and
integer arithmetic for counting. No `float`, no `numpy.float64`, no implicit floating-point
conversion at any boundary inside core.

## Why this is constitutive

Predication-categorical constructions compute equalities, partial orders, joins/meets/fusion,
and fixed points. Floating-point is a *lossy* substrate that silently corrupts these
operations:

- `0.1 + 0.2 != 0.3` collapses fixed-point detection.
- Lattice meets/joins under floats are non-associative at the ulp boundary.
- Bilattice values `(a, b)` computed via floats can drift across the diagonal that
  separates `≤_k` from `≤_t`, silently inverting answers.

This is hard-core C2 (pure-math substrate). Violating it corrupts the math floor that
PyFARS imports.

## What this rules out

- `float` for any value participating in lattice operations, fixed-point detection, or
  equality comparisons in core.
- `numpy` as a hard dependency. Numpy operates on float by default; adopting it would either
  require careful Fraction-typed array work (defeats numpy) or accept floats (defeats this
  duty).
- A "fast-mode" path using floats for performance. The library has one correctness surface;
  there is no fast path that yields the same answers as the slow path.

## What this does not constrain

- Test-suite arithmetic. Property tests may use float-based generators if they convert to
  `Fraction` before exercising core. The constraint is on what core *computes with*.
- External callers. PyFARS may use floats internally; pypredcalc's public API accepts
  `Fraction` and `int` and returns `Fraction` and `int`.
- Helpers computing counts, lengths, or indices — integer arithmetic is exact and fine.

## Enforcement

Pre-substrate: ruff lint rule (configurable) and code review. Post-substrate-automation:
the closure rule system can grep `src/` for `: float` annotations and `0.0` literals,
emitting a diagnostic.
