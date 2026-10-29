---
title: Predication
type: reference
status: historical-software-documentation
date-recorded: 2026-10-28
original-source: https://github.com/lenticule-science/science-services-section/blob/f72389d7f80824a2ac16ca5dd201e340bd4ca696/services/philosophy-services-section/services/logic-services-section/content/text/documents/articles/research/pypredcalc/prose/explanation/predication.md
source-revision: git-blob:sha1:2c44cfc39dc133027349ac2ed9f54e533d9f3116
---
## Realized

- `PredicationCell` — immutable `(s, p, o, v)` cell.
- `PredicationStore` — finite map of keys to bilattice values; insertion
  merges via the knowledge join (monotone in evidence).
- `PositingMorphism` — the explicit evidence-injection morphism
  `v ↦ v ∨_k δ_(s,p,o,q)`, with `SpeechActClass` and
  `speech_act_class(...)` realizing the FOUR-valued Belnap speech-act
  partition. `BOT` is abstaining and acts as the identity; `T`, `F`,
  and `TOP` are asserting, denying, and contesting respectively.
- `EntitySet` — finite stably-ordered carrier of subjects/objects
  (`objects/entity-set.md`).
- `PredicationValuation` — world-indexed family of stores
  (`objects/predication-valuation.md`).
- `PredicateSet` — finite ordered set of predicate identifiers,
  `Π = Ob(𝒞)` (`objects/predicate-set.md`).
- `PredicationCellSet` — Cartesian product `Φ = E × Π × E`
  (`objects/predication-cell-set.md`).
- `PredicateCategory` — small category whose objects are predicates,
  with the four canonical morphism classes
  (`objects/predicate-category.md`):
    - `PredicateSpecialization` — restriction along a sub-support.
    - `PredicateConverse` — `(s, o) ↦ (o, s)` swap.
    - `PredicateSubjectProjection` — collapse to the subject diagonal.
    - `PredicateObjectProjection` — collapse to the object diagonal.
  `compose(g, f)` returns a generated arrow whose pullback is
  contravariant, `(g ∘ f)^* = f^* ∘ g^*`, and whose four quantifier
  adjoints are staged through the middle predicate domain.
- `IndexMap.classify_predicate_generator(...)` witnesses whether a
  cellwise map has one of the four generator shapes from
  predicate-generator exhaustiveness. The witness separates shape
  recognition from the theorem's stronger `|E| >= 3` and orbit-union
  support hypotheses.
- Per-predicate domains: `PredicateCategory` carries an optional
  `domains: Mapping[Predicate, frozenset[(Entity, Entity)]]` (defaults
  to full `E × E`). Specialization generators are checked at
  construction time to satisfy `sub_support == dom(q) ⊆ dom(p)`.
  `dom_of(p)` exposes the domain; `validate_valuation(v)` enforces
  `support(v(p)) ⊆ dom(p)` for every predicate.
- `FiberValuation` — element of the fiber algebra `A_p` at a predicate;
  finite map `(s, o) → BilatticeValue` with default `BOT`. Each predicate
  morphism `f : q → p` carries a contravariant pullback
  `f^* : A_p → A_q`. Property tests
  (`tests/property/test_predicate_naturality_stability.py`) lock in
  the contravariance ``(g ∘ f)^* = f^* ∘ g^*`` and the canonical
  fact that pulling back any target fiber along a generator yields a
  natural source-fiber.
- `PredicateCategory.is_natural(valuation)` — checks the
  `predicate-category-naturality` condition: every generator
  `f : q → p` satisfies `f^*(v(p)) = v(q)`.

### Positing and speech acts

`pypredcalc.predication.positing` is the observation-side categorical surface.
`PositingMorphism(subject, predicate, object, value)` applies to a `PredicationStore` by knowledge-joining the datum into the target cell.
Same-cell composition joins the two data; distinct-cell positings commute.
The named constructors `assertive_positing`, `denial_positing`, and `contestation_positing` bind the three nontrivial FOUR speech-act classes.

The calculator delegates observation to this layer: `tell(...)` remains the compatibility spelling for assertion, while `posit(...)`, `assert_(...)`, `deny(...)`, `contest(...)`, and `abstain(...)` expose the speech-act vocabulary directly.
`posit_batch(...)` applies a finite collection before closure, and `operational_step(..., rule_system=...)` returns an `OperationalStep` witness with the initial calculator, the post-positing calculator, the closed final calculator, and the finite `locution` set of targeted cells.

Positing also has predicate-category naturality witnesses.
For a generator `f : q -> p`, `positing_naturality(...)` checks the single cell equation `f^*(posit(v)) = posit(f^*(v))`; projections can reindex one target diagonal posit into a finite source-side batch.
The `batch_positing_naturality(...)` witness records the finite-composite version of the same claim.

On captured finite settling trajectories, `PredicationSettling.truth_windows(predicate, subject, object)` returns the half-open assertion-time intervals where that cell is truth-designated.
A denial/retraction that raises a `T` cell to `TOP` closes the truth window without erasing the earlier positive evidence.

### Store ↔ fiber bridge

`pypred.predication.bridge` exposes the canonical conversion between the flat `PredicationStore` view (keyed by `(s, p, o)`) and the per-predicate `{predicate: FiberValuation}` view used by the categorical apparatus:

- `store_to_fibers(store, category)` — slice a store into one fiber per category predicate.
  Cells whose predicate is not in the category, or whose `(subject, object)` is outside `E × E`, are silently dropped (tolerant reader).
- `fibers_to_store(fibers, category)` — reassemble a store from a per-predicate fiber mapping.
  Unknown predicate keys and out-of-range cells are rejected loudly (strict writer).

The two operations are a section/retraction pair on canonical input: `store_to_fibers ∘ fibers_to_store = id` on fibers keyed by exactly the category predicates with in-range cells, and `fibers_to_store ∘ store_to_fibers = id` on stores all of whose cells are in scope.

### Functors between predicate categories

`PredicateFunctor(source, target, on_predicates, on_morphisms)` is a functor `F : 𝒞 → 𝒟` with object-action `on_predicates` (total on source predicates, lands in target) and morphism-action `on_morphisms` defined on the source generators (with source/target images consistent with the on-predicates renaming).
The constructor enforces functoriality at construction time.
`apply_to_morphism` is total on every arrow generated from source — identities go to identities, generators look up directly, composites recurse via ``F(g ∘ f) = F(g) ∘ F(f)``.
`restrict_valuation` implements the standard ``F^*(v_𝒟)(p) := v_𝒟(F(p))`` pullback of valuations along the functor; tests confirm naturality is preserved by restriction along a renaming functor.
Includes `identity(category)` and `compose(other)`.

### Hyperdoctrine witnesses

`PredicationHyperdoctrine` and `PredicationCalculator` expose structural witnesses for the PredCat hyperdoctrine layer:

- `PredicationFibration.check_axioms()` packages the A1-A3 cloven fibration layer as one inspectable certificate.
- `PredicationHyperdoctrine.check_axioms()` packages the full sampled A/B layer: fibration, B1 quantifier adjunctions, B2 Frobenius, B3 Beck-Chevalley, and both B4 comprehension schemas.
- `quantifier_adjunctions(f)` samples the B1k/B1t adjunctions `exists_f ⊣ f^* ⊣ forall_f` in both knowledge and truth orders.
- `frobenius(f)` samples the B2k/B2t Frobenius identities for `∧_k` and `∧_t`.
- `beck_chevalley(f, g, ...)` checks the B3 base-change square through the cellwise `IndexMap` reduction.
- `comprehension_adjunction(g, schema="classical"|"paraconsistent")` samples the B4 Lawvere comprehension adjunction.
- `fusion_frobenius(f)` deliberately checks the non-axiomatic fusion analogue.
  It holds for bijective reindexing such as converse and fails for specialization/projection when the off-image absorber mismatch appears.
- `predication_fiber_residuation_witness(v1, v2, v3)` records the cellwise `v1 ⊙ v2 ≤_t v3 iff v1 ≤_t v2 ⇒ v3` equivalence.
- `FiberClosureRuleSystem.regime_profile(...)` records the rule-language side of the four-regime dichotomy; finite settling runs generated from rule systems expose this as `theory_regime_profile` / `theory_regime`.

## Stubs

(none — the predication subpackage is fully realised at this layer; the fiber algebra is currently parameterised over the four-element Belnap bilattice rather than an arbitrary residuated lattice.)
