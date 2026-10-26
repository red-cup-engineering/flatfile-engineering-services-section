# pypredcalc

Pure-math primitives for predication-native computation. Zero runtime
dependencies; built on `fractions.Fraction` for exact arithmetic.

## Install

```sh
pip install -e .
```

For optional symbolic features (exact algebraic Perron eigenvalues, etc.):

```sh
pip install -e .[symbolic]
```

## Layout

| subpackage      | role                                              |
|-----------------|---------------------------------------------------|
| `algebra`       | Belnap bilattice (FOUR), pre-bilattice axiom-checker, Ginsberg twist-product, residuated lattice |
| `predication`   | predication cells, stores, fibers, predicate categories, fibrations, hyperdoctrines, closure systems, settling, parameter bases, store↔fiber bridge |
| `combinatorics` | posets, simplicial complexes, closure-rule systems |
| `topology`      | finite Alexandrov topology, finite Birkhoff/Priestley duality, transfinite cell complexes |
| `lattice`       | frames, frame morphisms, d-frames                 |
| `sheaf`         | Z-cohomology, cellular and frame-valued sheaves   |
| `dynamics`      | substitution matrices and corpus benchmark instances |
| `_linalg`       | internal Fraction-native exact linear algebra     |

## Status

This is a research-active library. Remaining `NotImplementedError` paths are
explicitly scoped unsupported generalizations, not placeholders for the core
predication SDK. See each module's docstring for the corpus reference.

## Quick Use

```python
from pypredcalc import BilatticeValue, PredicationCalculator

calc = PredicationCalculator.of(
    entities=["alice", "bob"],
    predicates=["parent"],
).tell("alice", "parent", "bob", BilatticeValue.T)

assert calc.value("alice", "parent", "bob") is BilatticeValue.T
assert calc.fiber("parent").get("alice", "bob") == (1, 0)
```

The core PredCat layers are inspectable as SDK objects. Use
`PredicationFibration(...).check_axioms()` for the A1-A3 fibration
certificate, `PredicationFibration(...).fiber_functor()` for the
contravariant `p -> A_p`, `f -> f*` fiber functor, and
`PredicationHyperdoctrine(...).check_axioms()` for the aggregate A/B
hyperdoctrine certificate. `PredicateCategory.compose(g, f)`
returns a generated predicate morphism whose pullback and four adjoints
are staged through the middle fiber domain.
`PredicateCategory.generator_pullback_closure(...)` returns the PredCat
pullback-closure witness for pairs of canonical generator arrows.
`IndexMap` remains the coordinate calculus for Beck-Chevalley and exposes
`classify_predicate_generator(...)` for the generator-exhaustiveness
cell-map component plus `pullback_square_witness(...)` for the cellwise
base-change square.

The calculator exposes the hyperdoctrine operations directly:
`pullback`, `exists_k`, `exists_t`, `forall_k`, `forall_t`,
`extension_t`, `extension_k`, `comprehension_t`, and `comprehension_k`.
Use `index_map(...)`, `beck_chevalley_square(...)`, and
`beck_chevalley(...)` for the cellwise base-change square and witness
behind the predication fibration.
Use `quantifier_adjunctions(...)`, `frobenius(...)`,
`comprehension_adjunction(..., schema=...)`, and
`fusion_frobenius(...)` when you need inspectable structural witnesses
for the hyperdoctrine laws and for the deliberate failure of
fusion-Frobenius.
Use `positing_naturality(...)` and `batch_positing_naturality(...)` to
witness that target-side evidence injection commutes with predicate
reindexing.
Use `refine_t(...)` or `refine_k(...)` to materialize a comprehension
as a named subpredicate in a new calculator.
Use `naturality()` or `is_natural()` to check coherence along the
predicate-category generators.

Observation is exposed as the corpus's positing morphism: use
`positing(...)` to inspect the morphism, `posit(...)` to apply an
arbitrary FOUR datum, and the speech-act conveniences `assert_(...)`,
`deny(...)`, `contest(...)`, and `abstain(...)`. The standalone
`PositingMorphism`, `SpeechActClass`, and `speech_act_class(...)` API
realizes the Belnap speech-act partition. Use `posit_batch(...)` to
apply a finite commuting collection of positings, or
`operational_step(..., rule_system=...)` to factor a settling step as
locution, illocution, and one closure/perlocution pass. Settling
trajectories expose `truth_windows(predicate, subject, object)` for the
finite assertion-time intervals where a cell is truth-designated.

Closure-rule systems run through `settle(...)`; `close(...)` returns a
new calculator at the final settled store. The calculator provides
`var`, `const`, `atom`, `all_of`, `any_of`, `rule`, and `rule_system`
builders for the closure-rule language.
Use `infer(...)` when the trajectory is not needed, and `quiescence(...)`
or `is_quiescent(...)` to check whether the current store is already
closed under a rule system. Rule systems expose
`regime_profile(...)`; settlings produced from rule systems carry the
corpus-side `theory_regime` and typed `theory_regime_certificate`.
Use `derive_regime_certificate(...)` when constructing regime-aware
integrations. Per-fiber closure operators expose
`check_c_natural_generated(...)` to check 𝒞-naturality over identities,
generators, and bounded generated composites; rule-generated cross-fiber
closures expose `output_naturality(...)` to witness that a closed state is
𝒞-natural. Use `flat_gauge_connection_witness(...)` for finite K4 gauge
connections on generated predicate-category morphisms and
`gauge_coboundary_witness(...)` for the corresponding finite H1
coboundary check. Use `gauge_twisted_reindexing(...)` and
`gauge_twisted_reindexing_witness(...)` for the K4-graded bilattice
fragment of gauge-twisted pullback; the witness records when only the
identity preserves the strict residuated fragment. Use
`settling_associated_sheaf(settling)` to compute the
finite-prefix increment-counting sheaf `F_U`, with free abelian stalks on
newly-added truth-top cells. Use `coarse_settling_moduli(...)` to group a
finite family of captured settlings by the sheaf-isomorphism signature
used by the coarse moduli classifying function, and
`paraconsistent_settling_associated_sheaf(...)`,
`negative_paraconsistent_settling_sheaf(...)`, and
`inconsistency_sheaf(...)` to inspect the Belnap-designated positive,
negative, and TOP-only increment sheaves. Use `finite_settling_h0(...)`
for finite-prefix `H^0` bases and
`truth_knowledge_h0_sequence_witness(...)` for the degree-zero shadow of
the truth/knowledge/inconsistency long exact sequence. Use
`finite_settling_h1_witness(...)` for caller-supplied non-Scott firing
generators and `void_cone_associated_graded_witness(...)` to pair those
generators with cells leaving the void.
`combined_cohomology_signature(...)` and
`CoarseSettlingModuli.combined_classifying_function(...)` package the
finite `H^0 ⊕ H^1` classifying morphism for regime-stratified moduli,
including the degree-zero bigraded truth/TOP refinement from
`bigraded_settling_cohomology(...)`.
`boolean_settling_q_enriched_sheaf(...)`
exposes the settling-associated sheaf as a finite Q-enriched
bitopological-site sample, optionally with explicit site restriction
constants. Use
`visible_entity_permutation_automorphisms(...)` or
`fiber_swap_automorphism_witness(...)` to inspect finite visible symmetry
sources of a captured settling. `CoarseSettlingModuli.point_stratum(...)`
classifies observed moduli points as rigid or orbifold from those visible
sources, while `automorphism_strata_witness(...)` separates visible
sources from the invisible subgroup. Use
`automorphism_h1_action_witness(...)` to inspect how stabilizing visible
and invisible sources act on supplied finite `H^1` generators.

## Test and type-check

```sh
python -m pytest tests/
python -m mypy src/pypredcalc
```

## Governance skills with executable scripts

PyPredCalc's development governance is a substrate of offices, duties,
powers, and skills. Two skills carry an executable script alongside the
`SKILL.md` that describes the procedure:

| skill | role |
|---|---|
| [`governance/skills/running-corpus-binding-audit/`](governance/skills/running-corpus-binding-audit/) | corpus ↔ pypredcalc binding audit; reports realisation coverage by atom type and broken `@realizes` slugs |
| [`governance/skills/computing-dispatch-readiness/`](governance/skills/computing-dispatch-readiness/) | substrate-native dispatch-readiness over the work tree; encodes work records as a `PredicationStore` and runs the readiness rules to fixpoint to derive the deterministic next-work selection |

## Coordinated projects

- The corpus's `tools/predication_categories/` (under
  `library/.../predication-categories/`) currently has its own copy of these
  primitives; the long-term plan is for that tool to consume `pypredcalc`
  directly and contribute thin verification modules via its `link.py`
  decorator system.
- `pypredcomp` (substrate kernel) is a separate project that consumes
  `pypredcalc` for the math layer and adds a Pydantic + LangGraph + FastAPI +
  MCP stack on top.

## Current custody

Computer Data / Metrologic owns this exact-arithmetic Python implementation and its native SDK. [Logic Science's original research prose](../../../../../../../../../science-services-section/services/philosophy-services-section/services/logic-services-section/content/text/documents/articles/research/pypredcalc/prose) retains the scientific claims. Finite executable witnesses here do not establish a Lean theorem or a deployed runtime. The `work/` and `governance/` trees are original project development records, not appointments to current offices.
