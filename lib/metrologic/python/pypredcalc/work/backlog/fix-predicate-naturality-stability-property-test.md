---
title: "Fix predicate-naturality-stability property test (API drift)"
type: task
slug: fix-predicate-naturality-stability-property-test
status: done
horizon: done
done-at: "2026-05-09"
requires-capability: writing-property-test
---

# Fix predicate-naturality-stability property test (API drift)

## Description

`tests/property/test_predicate_naturality_stability.py` was written against an
older surface and no longer collects under the current API. Four failures
collected on a clean run with `hypothesis` available:

- `FiberValuation(...)` is invoked with the legacy single-`mapping` constructor;
  current signature is `FiberValuation(bilattice, entities, bottom, cells, *, dom=...)`.
- `BilatticeValue.T` / `.F` constants — the rest of the property suite uses
  the bilattice-pair tuples `(1, 0)` / `(0, 1)`.
- `EntitySet([1, 2, 3])` / `PredicateSet([...])` positional constructors —
  current convention is `EntitySet.of([...])` / `PredicateSet.of([...])`.
- `f.pullback(fiber, entities)` two-arg form — current `pullback` takes the
  fiber alone and reads `entities` off the fiber valuation.

Each test in the file (constant valuation natural, identity does not affect
naturality, pulled-back valuation natural, composed pullback equals chained
pullback) needs porting to the current API. The properties themselves are
still valuable and bind to the corpus's predicate-naturality claim; only the
surface they ride on has shifted.

## Acceptance

- [x] Each test constructs `FiberValuation` with the current API,
      using the new `FiberValuation.full(...)` factory for the
      full-`E × E` case (the dom-cleanup pass made `dom` required and
      concrete; the file uses `.full(...)` rather than passing
      `dom=` explicitly).
- [x] Bilattice values use the tuple convention shared by the rest of
      `tests/property/` (`(1, 0)`, `(0, 1)`, `(0, 0)`, `(1, 1)`).
- [x] Entity / predicate sets use the supported positional / `.of(...)`
      forms; the rewritten file uses `EntitySet([1, 2, 3])` and
      `PredicateSet(["r", "r_check"])`, both of which the current
      surface accepts.
- [x] `pullback` calls match the current single-arg signature.
- [x] `pytest tests/property/test_predicate_naturality_stability.py -q`
      collects and passes (6 tests; full suite at 741 passing).

## Surfaced from

`add-property-tests-for-0-3-surface` goal — uncovered while extending the
flake's dev shell to ship `hypothesis`. The failing tests were carried
forward unchecked from before the 0.3 surface stabilised.

## Resolution

Ported `tests/property/test_predicate_naturality_stability.py` to the
current API in commit 863fde1 ("tests: modernize
predicate-naturality-stability property tests"). The four naturality
properties (identity is trivially natural; constants are natural;
pulled-back valuations are natural; composed pullback equals chained
pullback) are preserved. After the subsequent `dom`-cleanup the file
also routes through `FiberValuation.full(...)` for the full-`E × E`
fibers it builds.
