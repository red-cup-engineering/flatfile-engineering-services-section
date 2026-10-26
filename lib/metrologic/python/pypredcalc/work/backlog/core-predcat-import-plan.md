---
title: "Core PredCat import plan"
status: active
theory-basis:
  - predicate-category
  - predicate-generator-exhaustiveness
  - predicate-generator-pullback-closure
  - predication-fiber-functor
  - predication-fiber-residuation
  - predication-fibration
  - predication-hyperdoctrine
  - closure-operator
  - closure-2-monad
  - predication-settling
  - closure-rule-language
  - four-regime-dichotomy
  - settling-associated-sheaf
  - paraconsistent-settling-associated-sheaf
  - negative-paraconsistent-settling-sheaf
  - inconsistency-sheaf
  - finite-settling-h0-polynomial-time
  - transfinite-bounded-regime-h1-generators
  - aperiodic-classifying-invariant
  - truth-knowledge-cohomology-long-exact-sequence
  - q-enriched-curry-grothendieck-site
  - q-enriched-sheaf-direct-inverse-image
  - value-agnostic-void-cone-axiomatic
  - void-cone-associated-graded-direct
  - coarse-settling-moduli
  - gauge-connection
  - gauge-twisted-reindexing
  - gauge-twisted-reindexing-graded-homomorphism
  - flat-connections-classified-by-h1
  - bigraded-settling-cohomology
  - bigraded-cohomology-via-mapping-cone
  - combined-cohomology-classifying-morphism
  - invisible-automorphism-subgroup
  - visible-automorphism-quotient
  - equivariant-settling-cohomology
  - settling-automorphism-decomposition
---

# Core PredCat import plan

This plan keeps PyPredCalc moving through established predication
category theory rather than peripheral operational affordances.

## Completed in current working tree

- Package A1-A3 as `PredicationFibration.check_axioms()`.
- Surface the contravariant predication-fiber functor as
  `PredicationFiberFunctor`.
- Package A/B hyperdoctrine laws as `PredicationHyperdoctrine.check_axioms()`.
- Give generated predicate-category composites their full
  `PredicateMorphism` adjoint contract.
- Surface predicate-generator exhaustiveness at the `IndexMap` level via
  `classify_predicate_generator(...)`, with explicit entity-pair and
  `ψ = id` theorem-component scope.
- Surface predicate-generator pullback closure at the `PredicateCategory`
  level via `generator_pullback_closure(...)`.
- Surface `IndexMap` pullback-square formation as the coordinate
  Beck-Chevalley witness, not as a substitute predicate category.
- Surface predication-fiber residuation as an inspectable witness.
- Surface closure-rule regime data as `RuleSystemRegimeProfile` and carry
  it into `PredicationSettling`.
- Surface typed four-regime certificates as `PredicationRegimeCertificate`
  with closure-ordinal strata.
- Surface the finite-prefix settling-associated sheaf as
  `SettlingAssociatedSheaf`.
- Surface Belnap-designated positive, negative, and TOP-only
  finite-prefix settling sheaves as `ParaconsistentSettlingAssociatedSheaf`,
  `NegativeParaconsistentSettlingSheaf`, and `InconsistencySheaf`.
- Surface finite-prefix settling `H^0` bases and the degree-zero
  truth/knowledge/inconsistency exactness witness.
- Surface finite-prefix `H^1` generator witnesses for caller-supplied
  non-Scott firing representatives and the all-ones classifying invariant.
- Bind the settling-associated sheaf to the finite Q-enriched sheaf
  carrier as a sampled bitopological-site surface, with optional explicit
  Q-valued site restriction constants.
- Surface the finite void filtration and its associated-graded pairing
  with supplied `H^1` generators.
- Surface finite observed coarse moduli by sheaf-isomorphism signatures as
  `CoarseSettlingModuli`.
- Surface finite entity-permutation contributions to the visible
  automorphism quotient.
- Surface finite fiber-swap contributions to the visible automorphism
  quotient.
- Surface finite predicate-automorphism and internal gauge witnesses.
- Surface rigid/orbifold substratum witnesses for observed coarse moduli
  points.
- Surface finite K4 gauge connections over generated predicate-category
  morphisms, with H1 cocycle and 0-cochain coboundary witnesses.
- Surface K4-graded gauge-twisted reindexing witnesses without
  overclaiming strict residuated preservation.
- Surface the finite `H^0 ⊕ H^1` combined cohomology classifying
  signature and moduli-level combined classifying function.
- Surface finite degree-zero bigraded settling cohomology and carry it
  into the combined classifier.
- Surface finite invisible automorphism subgroup witnesses alongside the
  visible automorphism quotient sources.
- Surface stabilizer actions on supplied finite `H^1` generator bases.
- Check closure-operator 𝒞-naturality over bounded generated composites via
  `check_c_natural_generated(...)`.
- Check closed cross-fiber states for predicate-category naturality via
  `CrossFiberClosureOperator.output_naturality(...)`.

## Next core cycles

1. Equivariant H1 sector decomposition:
   classify supplied finite H1 generators by K4 character sector and
   compare sector counts against automorphism actions.
2. Gauge-twisted Beck-Chevalley boundary:
   expose the bottom-fixing subgroup where twisted reindexing remains
   functorial, and return curvature witnesses outside that subgroup.
3. Framework agreement samples:
   add one concrete F2-to-F3 strict-regime comparison witness on the
   existing Belnap finite fiber surface.
