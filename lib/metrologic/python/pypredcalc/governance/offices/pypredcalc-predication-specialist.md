---
title: "PyPredCalc Predication Specialist"
type: office
slug: pypredcalc-predication-specialist
scope: pypredcalc-predication-subpackage
action-domain:
  - write-pypredcalc-source
  - read-any-corpus-entity
  - read-any-pypredcalc-source
  - create-task-record
  - immunity-from-spec-violating-duty
deontic-profile:
  write-pypredcalc-source: power
  create-task-record: power
  read-any-corpus-entity: privilege
  read-any-pypredcalc-source: privilege
  immunity-from-spec-violating-duty: immunity
  decorate-every-realization: duty
  use-fraction-arithmetic-in-core: duty
  avoid-runtime-deps-in-core: duty
  return-witness-for-structural-claims: duty
  use-frozen-dataclasses: duty
  realize-from-corpus-before-coding: duty
  preserve-public-api-stability: duty
  maintain-subpackage-coherence: duty
provides-skill:
  - realizing-corpus-atom-as-python
  - verifying-naturality
  - verifying-quantifier-adjoints
  - working-with-fiber-valuations
  - working-with-closure-rules
jurisdiction:
  read: [theories/.../predication-categories/, src/, tests/]
  write: [src/pypredcalc/predication/, tests/test_predication*.py, tests/test_fiber*.py, tests/test_predicate_category.py, tests/test_hyperdoctrine.py, tests/test_closure*.py, tests/test_b*.py, tests/test_index_map_agrees_with_generators.py, tests/test_store_closure.py, tests/property/test_predicate_naturality_stability.py]
theory-basis: [office-as-double-settlement, jural-relation, normative-operational-layering, formality-layer]
---

# PyPredCalc Predication Specialist

The lab for `pypredcalc.predication`. Owns the calculator surface — the
predication-fiber-algebra, predicate category, hyperdoctrine, closure operator family,
predication settling, closure 2-monad and dualized comonad, parameter-base machinery, and
the fiber/store-level rule systems.

This is the largest subpackage and the one most directly load-bearing for the
math-floor-for-substrates commitment.

## Subpackage scope

`src/pypredcalc/predication/` contains all of:

- `entity_set.py`, `cell.py`, `store.py`, `valuation.py` — observation primitives.
- `fiber_valuation.py` — the predication fiber algebra `A_p = L^⋈_dom(p)`.
- `predicate_category.py` — `PredicateSet`, `PredicationCellSet`, `PredicateCategory`,
  the four canonical morphism classes (specialization, converse, subject/object projection)
  with pullbacks and adjoints.
- `functor.py` — `PredicateFunctor` between predicate categories.
- `bridge.py` — `PredicationStore` ↔ `{predicate: FiberValuation}`.
- `hyperdoctrine.py` — `PredicationHyperdoctrine` aggregate (B1–B4).
- `comprehension.py` — Lawvere comprehension (B4).
- `index_map.py` — IndexMap layer for Beck-Chevalley.
- `closure.py` — `ClosureOperator` (corpus `morphisms/closure-operator`).
- `closure_rule.py` — fiber-atom rule language (`CellAtom`, `And`, `Or`,
  `FiberClosureRule`).
- `closure_rule_system.py` — `FiberClosureRuleSystem` and `CrossFiberClosureOperator`.
- `closure_monad.py` — `ClosureMonad` (corpus `morphisms/closure-2-monad`).
- `closure_comonad.py` — `DualizedClosureComonad` and the algebra-coalgebra correspondence.
- `parameter_base.py` — `ParameterBase` and `BaseMorphism`.
- `settling.py` — `PredicationSettling`.
- `store_closure.py` — store-level rule system for downstream consumers.
- `witness.py` — structural witness types.

## Realizations under this office

The full B1–B4 hyperdoctrine surface:

- `objects/entity-set`, `objects/predicate-category`, `objects/predicate-set`,
  `objects/predication-cell-set`.
- `objects/predication-fiber-algebra`, `objects/predication-hyperdoctrine`,
  `objects/predication-settling`, `objects/parameter-base-category`.
- `morphisms/predicate-specialization`, `morphisms/predicate-converse`,
  `morphisms/predicate-subject-projection`, `morphisms/predicate-object-projection`.
- `morphisms/closure-operator`, `morphisms/closure-2-monad`,
  `morphisms/dualized-closure-2-comonad`.
- `concepts/closure-rule`, `concepts/closure-rule-system`,
  `concepts/predication-cell`, `concepts/predicate-category-naturality`.
- `theorems/beck-chevalley-commutation-on-predication-bilattices`,
  `theorems/closure-algebras-are-c-closed`,
  `theorems/closure-algebra-coalgebra-correspondence`,
  `theorems/lawvere-comprehension-classical`,
  `theorems/lawvere-comprehension-paraconsistent`.

## Specialist duties

- [`maintain-subpackage-coherence`](../duties/maintain-subpackage-coherence.md) — changes
  must preserve the categorical structure: pullbacks compose, adjoints satisfy adjunction
  units/counits, naturality squares commute.
- [`preserve-naturality-on-fiber-changes`](../duties/preserve-naturality-on-fiber-changes.md) —
  modifications to fiber-valuation operations must check 𝒞-naturality (per
  [`verifying-naturality`](../skills/verifying-naturality.md)) before commit.

## Specialist skills

- [`verifying-naturality`](../skills/verifying-naturality.md) — produces a
  `NaturalityWitness` over a sample of cross-fiber valuations.
- [`verifying-quantifier-adjoints`](../skills/verifying-quantifier-adjoints.md) — checks
  `∃_f ⊣ f^* ⊣ ∀_f` on each generator class for both `≤_k` and `≤_t`.
- [`working-with-fiber-valuations`](../skills/working-with-fiber-valuations.md) — building
  fibers, applying pullbacks, taking adjoints, computing fixed points.
- [`working-with-closure-rules`](../skills/working-with-closure-rules.md) — designing rule
  systems, classifying their regime, building closures.

## Incumbency

Currently held informally. Agent record at
[`pypredcalc-predication-specialist-agent`](../agents/pypredcalc-predication-specialist-agent.md).

Formal incumbency record: [`emsenn-incumbency`](../personnel/emsenn-incumbency.md) — captain holds this office informally pending substrate-driven dispatch.
