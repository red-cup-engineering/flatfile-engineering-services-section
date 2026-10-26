# Changelog

## Unreleased

### PredCat settling sheaves and finite cohomology

- Added `ParaconsistentSettlingAssociatedSheaf`,
  `NegativeParaconsistentSettlingSheaf`, and `InconsistencySheaf` for
  the Belnap-designated positive, negative, and TOP-only settling
  increment sheaves.
- Added `SettlingH0Witness`, `finite_settling_h0(...)`, and
  `truth_knowledge_h0_sequence_witness(...)` for finite-prefix `H^0`
  bases and the degree-zero truth/knowledge/inconsistency sequence.
- Added `SettlingH1Witness` and `finite_settling_h1_witness(...)` for
  explicit finite-prefix validation of supplied non-Scott firing
  generators and their all-ones classifying invariant.
- Added `settling_q_enriched_sheaf(...)` and
  `boolean_settling_q_enriched_sheaf(...)`, binding the
  settling-associated sheaf to the finite Q-enriched sheaf carrier,
  with optional explicit site restriction constants.
- Added `VoidCone` and `void_cone_associated_graded_witness(...)` for
  the finite void filtration and its associated-graded pairing with
  supplied `H^1` generators.
- Added `FlatGaugeConnectionWitness`,
  `flat_gauge_connection_witness(...)`, and
  `gauge_coboundary_witness(...)` for finite K4 gauge connections over
  generated predicate-category morphisms and their H1 coboundary
  classification.
- Added `gauge_twisted_reindexing(...)` and
  `gauge_twisted_reindexing_witness(...)` for the K4-graded bilattice
  fragment of gauge-twisted pullback, including order-profile and
  strict-residuation caveats.
- Added `CombinedCohomologySignature` and
  `combined_cohomology_signature(...)`, with
  `CoarseSettlingModuli.combined_classifying_function(...)`, for the
  finite `H^0 ⊕ H^1` classifying morphism.
- Added `BigradedSettlingCohomologyWitness` and
  `bigraded_settling_cohomology(...)` for the finite degree-zero
  truth/TOP bigraded refinement.
- Added `AutomorphismStrataWitness`,
  `automorphism_strata_witness(...)`, and invisible entity/predicate
  automorphism enumerators to separate the invisible subgroup from the
  visible automorphism quotient.
- Added `AutomorphismH1ActionWitness` and
  `automorphism_h1_action_witness(...)` for stabilizer actions on
  supplied finite H1 generator bases.

### Concrete calculator facade

- Added `PredicationCalculator`, a concrete FOUR-valued predication
  category calculator that builds the predicate category, store,
  fibration, hyperdoctrine, and fiber views from ordinary Python data.
- Kept `PredicationCalculator` as an SDK façade rather than marking it
  as a corpus-realizing mathematical object; the realized objects remain
  the fibration, hyperdoctrine, closure, settling, and related structures.
- Exposed hyperdoctrine quantifier operations on the calculator:
  `exists_k`, `exists_t`, `forall_k`, and `forall_t`.
- Exposed Lawvere comprehension operations on the calculator:
  `extension_t`, `extension_k`, `comprehension_t`, and `comprehension_k`.
- Added calculator refinement operations `refine_t(...)` and
  `refine_k(...)` for materializing a comprehension as a named
  subpredicate with its specialization generator.
- Exposed calculator-level predicate-category coherence checks:
  `naturality()` and `is_natural()`.
- Exposed calculator-level cellwise base-change operations:
  `index_map(...)`, `beck_chevalley_square(...)`, and
  `beck_chevalley(...)`.
- Tightened `PredicateCategory` construction so explicit generators
  must be one of the four canonical predication morphism classes.
- Validated canonical generator domains at `PredicateCategory`
  construction for converse, subject-projection, and object-projection,
  not only specialization.
- Added explicit predicate-category morphism membership checks so
  composition and calculator reindexing run along identities, declared
  generators, or generated composites rather than endpoint-compatible
  strangers.
- Added calculator-level closure helpers: `closure(rule_system)`,
  `settle(rule_system, bound=...)`, and `close(rule_system, bound=...)`.
- Added calculator-level closure fixed-point witnesses:
  `quiescence(rule_system)` and `is_quiescent(rule_system)`.
- Added concrete calculator builders for closure-rule syntax:
  `var`, `const`, `atom`, `all_of`, `any_of`, `rule`, and
  `rule_system`.
- Added `PredicationCalculator.infer(rule_system)` for direct closure
  inference when callers do not need a settling trajectory.
- Added explicit observation-side positing structure:
  `PositingMorphism`, `SpeechActClass`, `speech_act_class(...)`,
  `assertive_positing(...)`, `denial_positing(...)`,
  `contestation_positing(...)`, and `apply_positings(...)`. The
  calculator now routes `tell(...)` and `deny(...)` through `posit(...)`
  and exposes `positing(...)`, `assert_(...)`, `contest(...)`, and
  `abstain(...)`, making the Belnap speech-act partition visible at
  the SDK surface.
- Added `PredicationCalculator.posit_batch(...)` and
  `operational_step(..., rule_system=...)`, returning `OperationalStep`
  with `initial`, `after_positing`, `final`, and `locution` fields.
  This realizes the corpus factorization of operational settling steps
  as finite positing followed by exactly one closure pass.
- Added `PredicationSettling.truth_windows(predicate, subject, object)`
  and `TruthWindow`, realizing finite assertion-time intervals from the
  temporally bounded positing theorem over captured trajectories.
- Added first-class hyperdoctrine witnesses for the core PredCat axioms:
  `quantifier_adjunctions(...)` for B1k/B1t, `frobenius(...)` for
  B2k/B2t, `beck_chevalley(...)` for B3, and
  `comprehension_adjunction(..., schema=...)` for B4. The calculator
  routes to the same witness surface.
- Added `PredicationHyperdoctrine.check_axioms()`, an aggregate A/B
  certificate packaging the A1-A3 fibration witness with sampled B1,
  B2, B3, and B4 witnesses.
- Added `fusion_frobenius(...)` as an explicit negative/positive witness
  for the non-axiomatic fusion-Frobenius identity, making the
  bilattice non-integrality obstruction visible in the SDK.
- Added single and finite-batch positing naturality witnesses:
  `positing_naturality(...)` and `batch_positing_naturality(...)`,
  with standalone constructors in `pypredcalc.predication.positing`.
- Centralized the canonical FOUR ↔ boolean-twist encoding in
  `pypredcalc.predication.four`.

### Predication fibration is a first-class SDK object

- Added `pypredcalc.predication.fibration.PredicationFibration` as the
  explicit A1-A3 cloven fibration under `PredicationHyperdoctrine`.
- Added structural witnesses for fibration axioms via
  `check_a1()`, `check_a2()`, and `check_a3(...)`; these return
  witness objects with localized failures instead of collapsing the
  claim to a bare boolean.
- Added `PredicationFibration.check_axioms()`, an aggregate A1-A3
  certificate with direct access to the component witnesses and failed
  localized checks.
- Added `PredicationFiberFunctor`, exposed by
  `PredicationFibration.fiber_functor()`, with identity and
  contravariant-composition law witnesses for the corpus
  `predication-fiber-functor` theorem.
- Added `PredicateCategory.generated_morphisms(...)` and
  `ClosureOperator.check_c_natural_generated(...)`, so closure
  naturality can be checked over identities, generators, and bounded
  generated PredCat composites.
- Added `CrossFiberClosureOperator.output_naturality(...)`, which applies
  a rule-generated closure and returns a structural 𝒞-naturality witness
  for the closed cross-fiber state.
- Added `PredicationRegimeCertificate`, `PredicationRegimeName`, and
  `ClosureOrdinalStratum`, with rule-system and settling accessors for
  the corpus four-regime dichotomy.
- Added `SettlingAssociatedSheaf`, `FreeAbelianCellGroup`, and
  `settling_associated_sheaf(...)`, giving a finite-prefix executable
  surface for the corpus increment-counting sheaf.
- Added `CoarseSettlingModuli`, `SettlingSheafIsoSignature`, and
  `coarse_settling_moduli(...)`, a finite observed-component surface for
  the coarse moduli and its classifying function.
- Added `EntityPermutationAutomorphismWitness` and
  `visible_entity_permutation_automorphisms(...)` for the finite
  entity-permutation source of the visible automorphism quotient.
- Added `FiberSwapAutomorphismWitness` and
  `fiber_swap_automorphism_witness(...)` for the finite fiber-swap source
  of the visible automorphism quotient.
- Added `PredicateAutomorphismWitness`,
  `NegationGaugeAutomorphismWitness`, and finite rigid/orbifold
  `CoarseModuliPointStratum` witnesses for observed coarse moduli points.
- `PredicationHyperdoctrine` now exposes its underlying `.fibration`
  and delegates canonical fiber/reindexing behavior to it.
- Generated predicate-category composites now carry the full
  `PredicateMorphism` contract: their pullback is staged
  contravariantly, and their four quantifier adjoints are staged
  covariantly through the middle fiber domain.
- Added `IndexMap.classify_predicate_generator(...)` as an executable
  witness for the predicate-generator exhaustiveness shape, including
  the theorem's `|E| >= 3`, entity-pair target/source, orbit-union
  support, and canonical `ψ = id` endomorphism scope checks.
- Added `PredicateCategory.generator_pullback_closure(...)` and
  `PredicateGeneratorPullbackClosureWitness`, exposing the corpus's
  generator pullback-closure theorem at the PredCat layer instead of
  leaving pullback closure as a generic coordinate-level construction.
- Added `IndexMap.pullback_square_witness(...)`, exposing cellwise
  pullback carrier/projections/commutation as coordinate data for
  Beck-Chevalley.
- Added `predication_fiber_residuation_witness(...)` and
  `FiberValuation.residuation_witness(...)` for the pointwise
  `v1 ⊙ v2 ≤_t v3 iff v1 ≤_t v2 ⇒ v3` theorem.
- Added `RuleSystemRegimeProfile` and
  `FiberClosureRuleSystem.regime_profile(...)`, carrying the
  closure-rule-language side of the four-regime dichotomy into
  generated closures and finite settling runs.
- Removed stale README/package/backlog language that still described the
  algebra and predication SDK surfaces as stubs.

### Parameter-base settling push-forward is explicit

- `BaseMorphism.apply_to_settling(settling, target_closure)` now has a
  concrete implementation instead of an ambiguity-preserving
  `NotImplementedError`. The method, mirrored by
  `apply_to_settling_with_closure`, pushes each recorded trajectory
  stage through `apply_to_valuation`, collapses stages through
  `φ_λ`, and attaches the supplied target-side
  `CrossFiberClosureOperator`.
- `OrdinalMap.target_bound` may now be an image sub-bound of the target
  base's `settling_bound` (`≤`, not strict equality), which matches
  finite stage-collapsing base changes.

### Governance scripts collocated with their skills (no more `tools/`)

- The two scripts previously living under `tools/theory-comparison/`
  and `tools/work-dispatch/` are now collocated with the `SKILL.md`
  files that describe how their owning offices invoke them, mirroring
  the `governance/skills/<skill>/SKILL.md + script` shape used at the
  561-root governance layer. The chain
  *office → officers → duties → skills → scripts → work* now holds
  without a parallel `tools/` hierarchy.
  - `tools/theory-comparison/audit.py` →
    `governance/skills/running-corpus-binding-audit/audit.py`.
    The companion skill `auditing-corpus-realization-coverage` reads
    the *coverage* section of the same script's report.
  - `tools/work-dispatch/dispatch.py` →
    `governance/skills/computing-dispatch-readiness/dispatch.py`.
    The companion skill `selecting-next-work` invokes the same script
    for the head-of-queue selection.
  - The flat `governance/skills/*.md` files for these four skills
    became `governance/skills/<skill>/SKILL.md` directories.
  - The `tools/` directory (and its two stand-alone READMEs, whose
    content overlapped with the SKILL.md files) is deleted.
- The `pypredcalc-audit-tool` agent record (the unix-tool agent that
  is the script's deontic identity) updates its `location:` cell to
  the new path; no semantic change.
- All ~25 references in governance, work records, README, _index.md,
  CHANGELOG, prose, and the `test_work_dispatch.py` `sys.path`
  bootstrap are rewritten.
- Audit help-text drift fixed: governance skills no longer reference
  the never-implemented `--report-coverage` / `--report-violations`
  flags; the script always reports both sections, with `--report-orphans`
  controlling the third.

### Type-correctness cleanup: strict-mypy zero, `dom` design corrected

- `FiberValuation.dom` is now a required, keyword-only, concrete
  `frozenset[tuple[Hashable, Hashable]]` field. The previous
  `dom: ... | None = None` form smuggled an "I want full E×E" affordance
  through the type, forcing every read site to honour an `Optional` the
  runtime guaranteed away. The fix moves the affordance to two real
  entry points: `FiberValuation.full(bilattice, entities, bottom, cells)`
  builds a fiber over the full `E × E`, and the static helper
  `FiberValuation.full_dom(entities)` returns the rectangle for callers
  that share it across many fibers. Internal sites that previously
  relied on the `None` default were updated to pass the real per-
  predicate `dom_of(p)` (closure family in `dynamics/closure.py`) or
  the explicit full rectangle (`bridge.store_to_fibers`).
- `PredicateMorphism` (the abstract base) now declares the four
  adjoints (`existential_k`, `existential_t`, `universal_k`,
  `universal_t`) alongside `pullback`. Every predicate morphism
  carries them by the corpus theorem; the four canonical generator
  classes already implemented them, but the abstract declarations
  were missing — type checkers couldn't see the contract on
  `f: PredicateMorphism`. The base method bodies raise
  `NotImplementedError`, matching the existing `pullback` convention.
- Generic-T propagated through the witness types
  (`GeneratorNaturalityCheck`, `NaturalityWitness`, `QuiescenceWitness`,
  `BeckChevalleyCheck`/`Witness`, `ComprehensionAdjunctionCheck`/`Witness`,
  `ClosureAxiomCheck`/`Witness`), the comprehension/extension
  functions (`extension_t`, `extension_k`, `comprehension_t`,
  `comprehension_k`), `PredicateCategory.naturality` /
  `is_natural` / `validate_valuation`, the predicate-morphism
  subclass adjoints and their helpers (`_extend_by`,
  `_project_along_diagonal`, `_swap_image`, `_identity_adjoint`),
  the dynamics settling witnesses, and the index-map-side BC
  witness builder.
- `BaseMorphism.then` declares a third type variable so
  composition reads `[T,U] ; [U,V] → [T,V]` instead of the
  previous `BaseMorphism[U, ...]` placeholder. Identity classmethods
  on `ResidLatticeHom` and `BaseMorphism` are now staticmethods that
  construct an explicitly parameterized instance, since identity
  inhabits the diagonal `T == U`.
- `bridge.store_to_fibers` / `fibers_to_store` are honestly typed as
  `FiberValuation[int]` rather than the previous `[Hashable]`
  downcast — the FOUR↔twist encoding pins the cell type to
  `tuple[int, int]`.
- `tests/property/test_predicate_naturality_stability.py` ported to
  the current `FiberValuation` API; the four naturality properties
  (constant valuation natural, identity does not affect naturality,
  pulled-back valuation natural, composed pullback equals chained
  pullback) are preserved.
- Net mypy delta: **104 → 0** strict errors. ruff clean. **741 tests
  passing.**

### Substrate-native work dispatch (`governance/skills/computing-dispatch-readiness/`)

- New devkit `governance/skills/computing-dispatch-readiness/dispatch.py` — substrate-native
  realization of the work-dispatch-readiness rule. Encodes the
  pypredcalc work tree (tasks, goals, briefs, offices, powers) as
  a `pypredcalc.predication.store.PredicationStore` and the readiness
  preconditions (brief / dependency / capability / authority /
  goal-active / status-eligible / composite) as `StoreRule` objects.
  Runs the closure system to fixpoint; reads off each task's
  four-valued readiness verdict. Realises corpus theorem
  `dispatch-as-closure-rule-system` for the
  governance-of-pypredcalc-development case. CLI: head selection,
  full table, single-task inspection.
- New tests `tests/test_work_dispatch.py` — 16 tests covering
  capability-section normalisation, brief / dependency rule
  generation, end-to-end synthetic-tree scenarios (t-readiness
  selection, missing brief / brief-file / dependency / capability,
  missing-record fall-through), plus a smoke test against the live
  work tree.
- `governance/skills/computing-dispatch-readiness.md` and
  `governance/skills/selecting-next-work.md` now name the Python
  script as their canonical realization; the markdown procedures
  remain the manual fallback.
- `governance/specifications/work-dispatch-readiness.md` *Open gaps*
  section refactored — closure-rule-native realization is no longer
  a gap. Remaining gaps named precisely (full $\delta$-residuation
  for fiber-section dispatch; capacity-blocking rule;
  work-tree moduli) with captain decision points isolated where they
  exist.
- `work/questions/work-dispatch-as-closure-rule-system.md` updated to
  `status: partially-answered` with two sharpened sub-questions on
  Q1 ($\delta$-residuation, mostly mechanical) and Q2 (work-tree
  automorphisms, needs captain input).

### Transfinite cell complex: ergonomic predicate and brief

- New `topology.TransfiniteCellComplex.is_attached_at(cell, stage)` —
  the convenience predicate corresponding to `stage_of(cell) == stage`,
  named explicitly in the realization task's acceptance criteria.
- Backfill brief `work/briefs/transfinite-cell-complex-base.md`
  documenting the corpus's ω₁-cell-set definition, the realization's
  ω-bounded specialization, and the open questions left for the
  ordinal-typed and dimension-function follow-ups.
- Pre-existing B007 cleanup in `__post_init__` (cell-uniqueness loop
  was iterating `stages.items()` but using only the values).

### Q-enriched sheaf: witness-style sheaf-condition reporting

- New `sheaf.q_enriched.SheafConditionWitness` — frozen-dataclass witness
  for the cellular-poset case of corpus `objects/quantale-enriched-sheaf`.
  The witness aggregates one `SheafConditionCheck` per comparable pair of
  the cellular base, recording the parent stalk, restriction constant,
  expected child (`c ⊗ stalk[parent]`), and observed child. `holds` is the
  conjunction; `failures` localises the pairs where the consistency
  equation does not hold.
- New `sheaf.q_enriched.check_sheaf_condition(quantale, base, stalks,
  restriction_constants)` — the witness-returning predicate. Use this when
  a caller wants to inspect the sheaf condition without committing to
  constructing a `QEnrichedSheaf`.
- `QEnrichedSheaf.__post_init__` now drives sheaf-consistency validation
  through `check_sheaf_condition` and raises a new
  `SheafConditionError(witness)` (a `ValueError` subclass) when the
  witness does not hold; callers can recover the structured witness via
  `exc.witness`. Constructor data-shape errors (missing stalks, unknown
  cells, restriction constants outside the carrier) continue to raise a
  plain `ValueError`. Charter C3 ("witness-style returns for structural
  claims") is honoured for the structural claim while preserving the
  fast-fail at construction-time.
- Backfill brief `work/briefs/q-enriched-sheaf-base.md` documents the
  Ghrist-Lopez-North-Riess 2025 graph-case specialization the realization
  ships, what it is and is not, and the open questions left for the
  remaining `realize-q-enriched-sheaf-module` sub-tasks (tensor, internal
  hom, cohomology).

### Closure-rule language: twist-product fusion antecedents

- New `predication.closure_rule.FusionAtom` — antecedent atom of the form
  `v(p_a)(s_a, o_a) ⊙ v(p_b)(s_b, o_b) ≥_t V`, with twist-product fusion as
  the composition operator and a truth-order threshold (distinct from
  `CellAtom`'s knowledge-order threshold). `Formula` union now includes
  `FusionAtom`; `And` / `Or` accept it as a part; `collect_atom_variables`
  walks both sides.
- Mirror at the store level: `predication.store_closure.StoreFusionAntecedent`
  and `StoreRule` antecedent extended to accept fusion atoms with `≥_t`
  threshold semantics.
- Realises the corpus theorem `dispatch-as-closure-rule-system` (in the
  predicated-computing/agential-orchestration-platform tree) as a single
  rule rather than a multi-rule decomposition: the eligibility rule
  `capability(a) ⊙ required_cap(w) ≥_t threshold` is now expressible
  directly via `dispatch_eligibility_rule(...)` in `store_closure`.

### Tooling

- `governance/skills/running-corpus-binding-audit/audit.py` widened: per-type coverage now
  includes `theorems` and `examples` alongside `concepts` / `objects` /
  `morphisms`. The 0.3 theorem realisations (Beck-Chevalley, both Lawvere
  comprehensions, closure-algebras-are-c-closed, closure-algebra-coalgebra-
  correspondence) are now visible to the binding audit.
- Property-test surface for the 0.3 witness types: `closure-axiom-witness`,
  `cl-algebra/coalgebra correspondence`, `beck-chevalley witness`, and
  `comprehension adjunction` are now exercised by hypothesis-driven sweeps
  under `tests/property/`.
- `flake.nix` dev shell now ships `hypothesis` so property tests run
  inside `nix develop`.

## 0.3.0 — Calculator surface: hyperdoctrine + closure + settling + Cl-monad/comonad + parameter base

### The leap

The pre-0.3 surface was a structural prover: B1k/B1t/B2k/B2t/B3/B4 verified
on the predication fibration, but each axiom lived as a method on a
generator instance. There was no aggregate hyperdoctrine, no closure
operator at the predication level, no settling runtime, no Cl-monad
algebra/coalgebra check, and no parameter-base machinery for parametric
work. This release adds all five layers, turning the package from a
theorem-checker into an actual calculator.

### `predication.hyperdoctrine` (Sprint H)
- New `PredicationHyperdoctrine` aggregate over
  `(predicate_category, bilattice)`. Routes the existing B1k/B1t/B2k/B2t/B3/B4
  primitives through one ergonomic object. `H.f_star(f, φ)`,
  `H.exists_k/t(f, φ)`, `H.forall_k/t(f, φ)`, `H.extension_t/k(g)`,
  `H.comprehension_t/k(p, ψ)`, `H.fiber(p)`. Realises corpus object
  `predication-hyperdoctrine`.

### `predication.closure` (Sprint C1)
- New `ClosureOperator` realising corpus `morphisms/closure-operator`:
  a 𝒞-natural family `cl = (cl_p)_{p∈𝒞}`. Constructor enforces total
  coverage of the category's predicates. Four axiom-check methods
  produce structural `ClosureAxiomWitness` objects: monotone-≤_k,
  inflationary, idempotent, 𝒞-natural. `identity_closure` baseline.

### `predication.closure_rule` + `closure_rule_system` (Sprints C2/C3)
- `CellAtom`, `And`, `Or` — positive Boolean combinations of
  fiber-atoms `v(q)(s, o) ≥_k V`, realising corpus
  `concepts/closure-rule-language`.
- `FiberClosureRule` with free-vars / `∀`-block / antecedent /
  consequent. The `is_quantifier_free` classifier reads off the
  Scott-continuous fragment of the four-regime dichotomy directly from
  rule shape. Realises `concepts/closure-rule`.
- `FiberClosureRuleSystem.generate(hyperdoctrine)` builds a
  `CrossFiberClosureOperator` via Kleene iteration to fixed point.
  Cross-fiber operator is the natural artefact (rules read across
  predicates). Realises `concepts/closure-rule-system`. Verified on
  transitive closure, symmetric closure, multi-predicate propagation,
  ∀-block rules.

### `predication.settling` (Sprint S)
- `PredicationSettling.run(hyperdoctrine, closure, initial, bound)`
  iterates closure to fixed point or bound. Exposes `trajectory`,
  `quiescence_ordinal`, `is_quiescent`, `regime`. Settling-monotonicity
  is automatic when the closure is inflationary; `verify_monotone`
  exposes the structural check. Realises corpus object
  `predication-settling`.

### `predication.closure_monad` (Sprint A)
- `ClosureMonad` realising corpus `morphisms/closure-2-monad`. `apply`,
  `unit_at`, `multiplication_at` with structural witnesses.
  `is_cl_algebra(monad, v)` realises corpus theorem
  `closure-algebras-are-c-closed` as a structural object.

### `predication.closure_comonad` (Sprint CA)
- `DualizedClosureComonad` realising
  `morphisms/dualized-closure-2-comonad`. `is_cl_coalgebra`,
  `algebra_to_coalgebra`, `coalgebra_to_algebra` realise
  `theorems/closure-algebra-coalgebra-correspondence`: under
  Jung-Rivieccio duality the two characterisations agree on the
  underlying valuation. The corpus's primal-dual characterisation —
  "quiescent settling = Cl-algebra" matches "terminal dual settling =
  Cl*-coalgebra" — verified on settled trajectories.

### `predication.parameter_base` (Sprint B)
- `ParameterBase(L, C, E, λ)` and `BaseMorphism` realising corpus
  `objects/parameter-base-category`. Components: `ResidLatticeHom`
  (the `ℓ` factor), `PredicateFunctor` (the `π` factor — already
  realised), `EntityMap` (`e`), `OrdinalMap` (`φ_λ`).
- `apply_to_valuation` performs the four componentwise pullbacks on a
  cross-fiber valuation; non-injective maps merge fibers via
  knowledge-join. `then` composes morphisms. `identity` yields the
  categorical identity.

### Top-level imports
- All new aggregates re-exported from `pypredcalc.predication` and the
  top-level `pypredcalc` package.

## 0.2.6 — CI, coverage gate, ruff cleanup, corpus parity, property tests, store↔fiber bridge, PredicateFunctor, docs refresh

### Documentation refresh
- `README.md` layout table corrected: `algebra` now lists Belnap
  bilattice, pre-bilattice axiom-checker, Ginsberg twist-product, and
  residuated lattice (none of which are stubs); `predication` now
  lists fiber valuations, the store↔fiber bridge, and the predicate
  functor.
- `docs/index.md` subpackage list rewritten to match current realised
  surface, and a new "Quality gates" section enumerates the pytest
  suite (incl. property tests), the 90% branch-coverage floor, ruff
  + mypy --strict cleanliness, mkdocs --strict cleanliness, and the
  `check_corpus_parity.py` CI gate (with a pointer to the FARS
  `audit-realization-coverage` enumerator as its complement).
- `docs/algebra.md` rewritten: each of the four realised modules
  documented with its property-test anchor (bilattice interlacing
  laws, residuation adjunction laws).
- `docs/predication.md` extended with a "Store ↔ fiber bridge"
  section (tolerant-reader / strict-writer asymmetry, section-retraction
  laws) and a "Functors between predicate categories" section
  (constructor invariants, totality of `apply_to_morphism` on
  generated arrows via composite recursion, `restrict_valuation`,
  naturality preservation).



### Store ↔ fiber bridge
- New module `src/pypred/predication/bridge.py` exposing
  `store_to_fibers(store, category)` and
  `fibers_to_store(fibers, category)`. The flat `PredicationStore`
  view (keyed by `(s, p, o)`) and the per-predicate
  `{predicate: FiberValuation}` view are the same data sliced
  differently; the bridge is the canonical conversion between
  observation-side ingest and category-side computation.
    - `store_to_fibers` silently drops cells whose predicate is not in
      the category, and cells whose `(subject, object)` is outside
      `E × E`. The result is keyed by *every* category predicate
      (including those with no observed cells, which map to an empty
      fiber).
    - `fibers_to_store` rejects unknown-predicate keys and out-of-range
      cells (these would be authoring bugs upstream).
- 11 tests in `tests/test_bridge.py` covering: per-predicate slicing,
  silent dropping of unknown predicates, silent dropping of
  out-of-entity cells, predicates with no observed cells, full
  round-trip for in-scope cells, drop-on-round-trip for out-of-scope
  predicates, error cases (unknown key, out-of-range cell), and the
  empty-fiber identity.

### PredicateFunctor
- New module `src/pypred/predication/functor.py` with the
  `PredicateFunctor` dataclass — a functor between two
  `PredicateCategory` instances carrying `on_predicates` (object map)
  and `on_morphisms` (action on generators).
- The constructor enforces functoriality:
    - `on_predicates` is total on source predicates and lands in the
      target.
    - `on_morphisms` is total on source generators, and each image's
      `(source, target)` agrees with the on-predicates image of the
      original generator's `(source, target)`.
- Provides `apply_to_predicate`, `apply_to_morphism` (sends identities
  to identities by convention; explicit generators must have an entry),
  `restrict_valuation` (the standard ``F^*(v_𝒟)(p) := v_𝒟(F_0(p))``
  action), the class-method `identity(category)`, and
  `compose(other)`.
- 12 tests in `tests/test_functor.py` covering construction,
  validation rejections (partial on_predicates, unknown target
  predicate, missing generator image, wrong source/target on image),
  identity / composition (renaming chain `A → B → C`, mismatched
  endpoints rejected), `apply_to_morphism` on identities and
  unknown morphisms, `restrict_valuation` substitutes correctly /
  raises on missing target fibers, and the headline property:
  **naturality is preserved by restriction along a renaming functor**.



### Property tests
- New `tests/property/` package with 47 hypothesis-driven tests across
  four target areas:
    - `test_bilattice_laws.py` — exhaustive enumeration of FOUR's
      truth- and knowledge-order lattice axioms (commutativity,
      associativity, idempotence, absorption, order/lattice
      consistency), plus negation laws (involutivity, de Morgan in the
      truth order, knowledge-order homomorphism, fixed-points BOT/TOP,
      swap T↔F).
    - `test_residuation_adjunction.py` — the adjunction
      ``a ⊗ b ≤ c iff b ≤ a → c`` for the boolean instance and a
      hypothesis-generated family of finite chain Heyting algebras
      (n+1-element chains with ⊗ = ∧). Verifies the residuum is the
      *largest* solution, plus integrality and unit-neutrality.
    - `test_frame_morphism_preservation.py` — `restrict_with` preserves
      finite meets, joins, top (=clopen), bottom, and is monotone on
      hypothesis-generated PowersetFrames (size ≤ 4). The right-adjoint
      Galois connection holds, plus its unit ``x ≤ f^*(f(x))`` and
      counit ``f(f^*(y)) ≤ y``. Identity-morphism preservation as a
      smoke test.
    - `test_predicate_naturality_stability.py` — `is_natural` is
      preserved by the constant-bottom valuation, by all constant
      valuations, and (most importantly) by valuations defined as the
      pullback of the target fiber along the unique generator —
      asserting the pullback construction itself produces natural
      valuations. Also exercises the categorical-structure stability:
      ``id ∘ f = f``, ``g ∘ id = g``, and contravariance of pullback
      under composition: ``(g ∘ f)^* = f^* ∘ g^*``.

  These tests target operations directly (not the validating
  constructors), so a regression in e.g. `truth_join`'s table would be
  caught even if the bilattice constructor still accepts FOUR.



### Corpus parity
- New `scripts/check_corpus_parity.py`: walks the predication-categories
  corpus, finds every markdown file with a ``python:`` frontmatter
  binding, and verifies each binding resolves to a real importable
  pypredcalc symbol via ``importlib`` + ``getattr`` walking. Mirrors the
  existing ``lean:`` convention. Supports ``--report-orphans`` to list
  pypredcalc public symbols (from any subpackage's ``__all__``) that no
  corpus entity cites.
- Wired as a new ``corpus-parity`` job in ``pypred-ci.yml``; the
  workflow now also triggers on pushes/PRs that touch the corpus
  predication-categories directory, so a corpus binding edit cannot
  drift from pypredcalc without breaking CI.
- Companion to the existing FARS skill
  ``governance/skills/engineering/audit-realization-coverage/``
  which enumerates *which* corpus entities lack a ``python:`` (the
  worklist); this script verifies the bindings that *do* exist (the
  drift gate).
- Hardened parity checker per architect review:
    - **Namespace scoping (severe fix).** `resolve_symbol` now requires
      every dotted path to equal `pypred` or start with `pypred.`. A
      corpus binding to e.g. `pathlib.Path` would previously have
      passed (real importable symbol); now rejected. Closes the gap
      where the gate accepted any importable path and incidentally
      executed import-time side effects of unrelated modules.
    - **Parser hardening.** `parse_python_bindings` now correctly
      ignores YAML null forms (`null`, `~`, `[]`, `''`, `""`) and
      supports the inline list shape `python: [a, b, c]` in addition to
      the existing scalar and block-list forms.
- Authored 13 initial bindings on the high-confidence corpus entities
  whose pypredcalc analogs already exist (architect review rejected an
  initial 14th binding `objects/bilattice → pypred.algebra.BilatticeValue`
  as a semantic mismatch — `BilatticeValue` is a concrete carrier value
  enum, not the algebra-structure the corpus `bilattice` definition
  describes; pypredcalc currently has no general bilattice-structure class
  to bind to, only `PreBilattice` (axiom-checker) and `TwistBilattice`
  (the corpus `twist-product` realization, separately bound)):

  | corpus entity | pypredcalc symbol |
  |---|---|
  | objects/entity-set | `pypred.predication.EntitySet` |
  | objects/predicate-set | `pypred.predication.PredicateSet` |
  | objects/predicate-category | `pypred.predication.PredicateCategory` |
  | objects/d-frame | `pypred.lattice.DFrame` |
  | objects/alexandrov-topology | `pypred.topology.AlexandrovTopology` |
  | objects/residuated-lattice | `pypred.algebra.ResiduatedLattice` |
  | objects/twist-product | `pypred.algebra.TwistBilattice` |
  | morphisms/predicate-specialization | `pypred.predication.PredicateSpecialization` |
  | morphisms/predicate-converse | `pypred.predication.PredicateConverse` |
  | morphisms/predicate-subject-projection | `pypred.predication.PredicateSubjectProjection` |
  | morphisms/predicate-object-projection | `pypred.predication.PredicateObjectProjection` |
  | concepts/predication-cell | `pypred.predication.PredicationCell` |
  | concepts/predicate-category-naturality | `pypred.predication.PredicateCategory.is_natural` |

  Realization coverage on this commit: **13 / 133** entities
  (objects 7/73, morphisms 4/25, concepts 2/35). The remaining 120 are
  legitimately unrealized — they are downstream theorems, sheaf-theoretic
  / cohomological objects, or stubs (settling, cosettling, q-enriched,
  transfinite cell complex). See the FARS audit skill for the full
  worklist.

### Tooling
- New `.github/workflows/pypred-ci.yml`: lint (ruff), mypy --strict on the
  symbolic extra, pytest on Python 3.11 + 3.12, pytest with the `[symbolic]`
  extra, and `mkdocs build --strict`. Path-filtered to the pypredcalc subdir.
- `pytest-cov` and `hypothesis` added to the `[dev]` extra.
- pytest now enforces a **90 % coverage floor** (`--cov-fail-under=90`) and
  emits term-missing + `coverage.xml`. Branch coverage enabled. Baseline
  on this commit: **91.66 %** with the three remaining stub modules
  (`topology/transfinite_cell_complex`, `dynamics/cosettling`,
  `sheaf/q_enriched`) excluded only by the `raise NotImplementedError`
  exclude rule. Floor will ratchet up as stubs are realised.
- Ruff is now clean across `src/` and `tests/`. Bug fixes uncovered:
    - `_linalg/inverse.py`, `_linalg/matrix.py`, `sheaf/frame_valued.py`
      now pass `strict=True` to every `zip(...)` over equal-length
      sequences (`B905`).
    - Renamed ambiguous loop variables `l` → `cand` /  `col` in
      `algebra/pre_bilattice.py` and `_linalg/matrix.py` (`E741`).
    - Removed dead `sp = _require_sympy()` assignment in
      `dynamics/_symbolic.py` (`F841`).
- `mypy` now treats `sympy` via `ignore_missing_imports` (sympy ships no
  `py.typed`); the dead `# type: ignore[import-untyped]` comment was
  removed.

## 0.2.5 — Predicate-category domains

### Predication
- `PredicateCategory` now carries an optional per-predicate domain
  assignment ``dom : Π → 2^{E×E}``, defaulting to the full ``E × E``
  for any unspecified predicate. Construction validates:
    - every supplied domain is a subset of ``E × E``;
    - every key in `domains` is a member of the predicate set;
    - for every `PredicateSpecialization` generator ``f : q → p``,
      ``sub_support == dom(q)`` and ``dom(q) ⊆ dom(p)`` — the
      sub-support inclusion ``ι_f : dom(q) ↪ dom(p)`` from the corpus
      definition.
- New `PredicateCategory.dom_of(predicate)` accessor.
- New `PredicateCategory.validate_valuation(valuation)` — raises if any
  fiber's support escapes its predicate's domain.
- `FiberValuation.__post_init__` now canonicalises (drops `BOT`-valued
  cells) and stores the canonicalised cells behind a
  `types.MappingProxyType`, so structural equality holds regardless of
  how the user expressed the valuation and external code cannot mutate
  the internal mapping after construction.
- `PredicateCategory.domains` is likewise wrapped in `MappingProxyType`
  after `__post_init__` validation, preserving the verified
  specialization/domain invariants.

## 0.2.4 — Predicate category

### Predication
- `pypred.predication.predicate_category` realised — the categorical
  apparatus over predications:
    - `PredicateSet` — finite ordered carrier `Π = Ob(𝒞)`.
    - `PredicationCellSet` — Cartesian product `Φ = E × Π × E` with
      lexicographic iteration.
    - `FiberValuation` — element of the fiber algebra `A_p`; finite map
      `(s, o) → BilatticeValue` with default `BOT`, structural equality.
    - `PredicateMorphism` (abstract) plus the four canonical generator
      classes — `PredicateSpecialization`, `PredicateConverse`,
      `PredicateSubjectProjection`, `PredicateObjectProjection` — each
      carrying a contravariant pullback on fiber valuations.
    - `PredicateIdentity` and a derived `_ComposedMorphism` for
      `compose`, with identity-collapse.
    - `PredicateCategory` validates that every generator's source/target
      lies in the predicate set and every specialization sub-support
      lies in `E × E`. `is_natural(valuation)` checks the
      `predicate-category-naturality` condition across every generator.

### Stubs eliminated
- `predication/predicate_category`. Remaining stubs:
  `topology/transfinite_cell_complex`,
  `dynamics/{settling, cosettling}`,
  `sheaf/q_enriched`.

## 0.2.3 — Priestley duality + predication carriers + Kronecker

### Topology
- `pypred.topology.priestley.FiniteDistributiveLattice` realised: finite
  bounded distributive lattice with closure / commutativity / absorption
  / distributivity validation; `is_join_irreducible` and
  `join_irreducibles()` helpers.
- `priestley_dual(L)` returns the `FinitePriestleySpace` (the poset of
  join-irreducibles) and `lattice_from_poset(P, leq)` returns its
  recovered down-set lattice — finite Birkhoff duality in both
  directions.

### Predication
- `pypred.predication.entity_set.EntitySet` realised: stably-ordered
  finite carrier (de-duplicating `of()`, `union`, `intersection`).
- `pypred.predication.valuation.PredicationValuation` realised:
  world-indexed family of `PredicationStore`s, with
  `knowledge_merge_all()` (cross-world conflict yields ``top``) and
  `truth_consensus(worlds)` (conservative meet across worlds).

### Linalg
- `Matrix.is_nonnegative()` / `Matrix.is_positive()` predicates.
- `Matrix.kronecker(other)` — exact tensor product.

### Stubs eliminated
- `topology/priestley`, `predication/entity_set`, and
  `predication/valuation`. Remaining stubs:
  `topology/transfinite_cell_complex`, `dynamics/{settling, cosettling}`,
  `predication/predicate_category`, `sheaf/q_enriched`.

## 0.2.2 — Linalg + topology + residuated lattice

### Linalg
- `Matrix.power(k)` and `Matrix.__pow__` — binary exponentiation; raises
  on non-square matrices or negative exponents.
- New `pypred._linalg.inverse` and `pypred._linalg.solve` — exact
  Gauss–Jordan inverse and linear solve over Q. Multiple-RHS supported.
  Raises `ValueError("singular matrix")` on singular input.

### Topology
- `pypred.topology.alexandrov.AlexandrovTopology` realised: finite
  Alexandrov space induced by a preorder, with `is_open`, `is_closed`,
  `minimal_open`, `closure`, and `opens()`.
- `specialisation_preorder(carrier, opens)` recovers the preorder from
  its lattice of opens — completes the finite preorder ↔ Alexandrov
  topology bijection.

### Algebra
- `pypred.algebra.residuated_lattice.ResiduatedLattice` realised: finite
  commutative integral residuated lattice, with derived `residuum`.
  Construction validates lattice, monoid, integrality, monotonicity,
  and the residuation adjunction. `boolean_residuated_lattice()`
  returns the two-element case.

### Stubs eliminated
- `algebra/residuated_lattice` and `topology/alexandrov` are now real
  implementations. Remaining stubs: `topology/priestley`,
  `topology/transfinite_cell_complex`, `dynamics/settling`,
  `dynamics/cosettling`, `predication/{entity_set, predicate_category,
  valuation}`, `sheaf/q_enriched`.

## 0.2.1 — Post-refactor improvements

### Linalg
- `eigenvalues_numeric` and `_all_roots_durand_kerner` accept `max_iter`,
  `tol`, and `strict` keyword arguments. With `strict=True` a new
  `pypred._linalg.ConvergenceError` is raised when Durand–Kerner fails to
  reach tolerance (typical for clustered/multiple roots).
- `spectral_radius` exposes `max_iter` and `tol`.

### Substitution dynamics
- `SubstitutionMatrix.is_primitive()` default bound is now Wielandt's
  ``n²−2n+2`` (mathematically tight; no false negatives) instead of the
  fixed `max_power=12` heuristic.
- New `SubstitutionMatrix.perron_exact()` returns the exact symbolic
  Perron eigenvalue via the optional `[symbolic]` extra. Raises
  `pypred.dynamics._symbolic.SymbolicExtraNotInstalled` if sympy is
  absent.

### Algebra
- `pre_bilattice.PreBilattice` realised: finite pre-bilattice
  axiom-checker (validates partial-order + lattice axioms over both
  truth and knowledge orders).
- `twist_product.TwistBilattice` realised: Ginsberg's L⋈L on an arbitrary
  bounded lattice, with `boolean_twist()` recovering the four-element
  Belnap bilattice FOUR.

## 0.2.0 — Greenfield refactor

Layered subpackages, zero runtime dependencies, explicit homes for the
unimplemented PredCat primitives.

### Architecture

- **Layout**: flat `category/` collapsed into mathematical-layer subpackages
  `algebra/`, `predication/`, `combinatorics/`, `topology/`, `lattice/`,
  `sheaf/`, `dynamics/`, plus internal `_linalg/`.
- **Zero runtime deps**: sympy moved to optional `[symbolic]` extra. New
  `_linalg/` module provides Fraction-native exact arithmetic
  (Bareiss determinant, Faddeev–LeVerrier characteristic polynomial,
  Smith normal form) and a Durand–Kerner numerical eigenvalue solver.
- **Stubs**: every PredCat primitive that exists as a corpus markdown note
  but lacks a Python implementation is now a typed module with a docstring
  pointing at its corpus reference and a `NotImplementedError` body.
  Affected families: pre-bilattice, twist-product, residuated-lattice,
  predication categorical apparatus (entity-set, predicate-category,
  valuation), Alexandrov / Priestley / transfinite-cell-complex topology,
  Q-enriched sheaves, full-form settling and cosettling dynamics.

### Cohomology

- `cohomology_rank` and `coboundary_matrix` extracted from
  `simplicial_complex.py` into `pypred.sheaf.cohomology`. Carrier and derived
  construction are now distinct modules.

### Tooling

- `py.typed` marker added.
- `ruff` config (line-length 100, py311, E F W I B UP).
- MkDocs scaffold under `docs/`.
- `mypy strict` continues to pass.

### Breaking

- All imports change. Old `from pypred.category import ...` and
  `from pypred.core import ...` paths are removed. New imports go through
  the layered subpackages or the flat re-export at `from pypredcalc import ...`.
- `SubstitutionMatrix.matrix` is a `pypred._linalg.Matrix`, not `sympy.Matrix`.
- `SubstitutionMatrix.perron_eigenvalue` returns `complex` (numerical),
  not `sympy.Expr`. Exact symbolic Perron requires the `[symbolic]` extra
  (separate API, not yet shipped).

## 0.1.0

Initial release with `category/` namespace and sympy runtime dependency.
