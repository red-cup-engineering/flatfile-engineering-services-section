---
title: "Add property tests for 0.3 calculator surface"
type: goal
slug: add-property-tests-for-0-3-surface
status: met
horizon: done
theory-basis:
  - charter-as-closure-system
  - witness-style-structural-returns-commitment
tasks:
  - property-test-closure-axiom-witness
  - property-test-cl-algebra-correspondence
  - property-test-beck-chevalley-witness
  - property-test-comprehension-adjunction
---

# Add property tests for 0.3 calculator surface

The 0.3 release added several witness types and structural claims that ship with unit
tests but no hypothesis-driven property tests:

- `ClosureAxiomWitness` (per-axiom checks on closure operators).
- `ClAlgebraWitness` / `ClCoalgebraWitness` (algebra-coalgebra correspondence).
- `BeckChevalleyWitness` (BC commutation).
- `ClStarCounitWitness` / `ClStarComultiplicationWitness` (dualized comonad).
- `ComprehensionAdjunctionWitness` (Lawvere comprehension).

The conventions duty
[`write-property-test-for-structural-claim`](../../governance/duties/write-property-test-for-structural-claim.md)
calls for property tests on structural claims; this goal closes the gap on the new surface.

## Theory grounding

C3 (witness-style structural returns) is constitutive: structural claims return
witnesses, not bools. The witness's structural fields are authoritative; property tests
substantiate that the fields are coherent across input sweeps. Without property tests,
the witness's `holds: bool` is the only observable in tests — collapsing the very
structure C3 commits to.

## Acceptance

- [x] `tests/property/test_closure_axiom_witness.py` — generators for closure-operator
      family + sample fibers; assert axiom witnesses' coherence (all four axioms,
      plus a deliberately-broken family that fails inflationary).
- [x] `tests/property/test_cl_algebra_correspondence.py` — generators for cross-fiber
      valuations; assert `algebra_to_coalgebra` and `coalgebra_to_algebra` round-trip
      preserving holds and failures.
- [x] `tests/property/test_beck_chevalley_witness.py` — generators for generator pairs
      `(f, g)` and fibers; assert BC witness holds on every pullback square.
- [x] `tests/property/test_comprehension_adjunction.py` — generators for sub-supports
      and fiber valuations (entity sets size 2-4); assert classical and paraconsistent
      comprehension adjunctions hold.
- [x] All four task tests pass under `pytest tests/property/ -q`. (One unrelated
      property test, `test_predicate_naturality_stability.py`, has a pre-existing
      drift against the `FiberValuation` constructor and is tracked separately.)

## Resolution

All four task-specific tests are landed and passing. The 0.3 witness surface
(`ClosureAxiomWitness`, `ClAlgebraWitness`/`ClCoalgebraWitness`,
`BeckChevalleyWitness`, comprehension-adjunction equivalence) is now
exercised by hypothesis-driven sweeps. The flake's dev shell now ships
`hypothesis` so the tests run inside `nix develop`. A separate unrelated
issue — `test_predicate_naturality_stability.py` calls
`FiberValuation(...)` with the older two-arg constructor — was surfaced
while collecting tests and is filed as a follow-up rather than fixed
under this goal.
