---
title: "Verify fibration axioms A1 A2 A3"
type: task
slug: verify-fibration-axioms-a1-a2-a3
status: done
horizon: done
requires-capability: writing-structural-witnesses
goal: realize-predication-fibration-as-cloven-object
created-by: pypredcalc-corpus-tracker
corpus-slug: objects/predication-fibration
---

# Verify fibration axioms A1 A2 A3

## Description

Implement witness-style checks for the predication fibration axioms:

- A1: each fiber is canonically the bilattice-valued relation object over the
  predicate domain.
- A2: generator morphisms act by their declared cellwise reindexing.
- A3: reindexing preserves the bilattice-residuated fiber structure.

The result should follow the repo's structural-claim convention: return frozen
dataclass witnesses with localized checks and failures, never bare booleans.

## Acceptance

- [ ] A witness dataclass records the axiom name, localized checks, and
      aggregate `holds`.
- [ ] `PredicationFibration.check_a1()` returns a witness.
- [ ] `PredicationFibration.check_a2()` returns a witness for generator action.
- [ ] `PredicationFibration.check_a3(samples=...)` returns a witness over
      supplied fiber samples.
- [ ] Tests include both holding and failing witness examples where possible.

## Resolution

Added `FibrationAxiomCheck` and `FibrationAxiomWitness`. `check_a1()` verifies
canonical fiber uniformity, `check_a2()` checks generator action against the
chosen `IndexMap` cleavage, and `check_a3()` checks reindexing preservation of
negation plus the binary fiber operations over canonical or supplied samples.
Tests include a coherent specialization category and an incoherent converse
domain assignment whose A2 witness localizes the failure.

## References

- Governance decision:
  `work/governance/decisions/witness-style-returns-for-structural-claims.md`.
- Existing witness patterns: `predication.closure`, `predication.comprehension`,
  and `predication.witness`.
