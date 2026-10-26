---
title: "PyPredCalc Combinatorics Specialist"
type: office
slug: pypredcalc-combinatorics-specialist
scope: pypredcalc-combinatorics-subpackage
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
  - verifying-poset-laws
  - verifying-simplicial-shape
  - working-with-propositional-closure-rules
jurisdiction:
  read: [theories/.../predication-categories/, src/, tests/]
  write: [src/pypredcalc/combinatorics/, tests/test_poset.py, tests/test_simplicial_complex.py, tests/test_closure_rule.py]
theory-basis: [office-as-double-settlement, jural-relation, normative-operational-layering]
---

# PyPredCalc Combinatorics Specialist

The lab for `pypredcalc.combinatorics`. Owns the order- and complex-theoretic primitives:
finite poset, order complex, simplicial complex with face structure, and the propositional
(set-monotone) closure-rule system that predates the bilattice-valued machinery in the
predication subpackage.

## Subpackage scope

`src/pypredcalc/combinatorics/` contains:

- `poset.py` — finite poset, order complex.
- `simplicial_complex.py` — finite simplicial complex with face structure.
- `closure_rule.py` — propositional closure-rule system (state is `frozenset[Hashable]`),
  retained per [`fiber-and-store-rule-systems-coexist`](../decisions/fiber-and-store-rule-systems-coexist.md)
  for the strict-regime FOUR collapse case.

## Specialist duties

- [`maintain-subpackage-coherence`](../duties/maintain-subpackage-coherence.md) — poset
  laws (reflexivity, antisymmetry, transitivity) hold under any modification; simplicial
  complexes preserve closure-under-faces.

## Specialist skills

- [`verifying-poset-laws`](../skills/verifying-poset-laws.md) — checks reflexivity,
  antisymmetry, transitivity on a candidate order relation.
- [`verifying-simplicial-shape`](../skills/verifying-simplicial-shape.md) — checks
  closure-under-faces and the face-set monotonicity.
- [`working-with-propositional-closure-rules`](../skills/working-with-propositional-closure-rules.md) —
  designing rule systems on propositional state, computing forward trajectories, computing
  cosettlings.

## Boundary with the predication specialist

The combinatorics `ClosureRuleSystem` is propositional (set-monotone); the predication
`FiberClosureRuleSystem` is bilattice-monotone. They serve different cases (strict-regime
FOUR collapse vs. full corpus rule language). Per
[`fiber-and-store-rule-systems-coexist`](../decisions/fiber-and-store-rule-systems-coexist.md),
both ship; the combinatorics specialist owns the propositional version, the predication
specialist owns the bilattice version.

## Incumbency

Currently held informally. Agent record at
[`pypredcalc-combinatorics-specialist-agent`](../agents/pypredcalc-combinatorics-specialist-agent.md).

Formal incumbency record: [`emsenn-incumbency`](../personnel/emsenn-incumbency.md) — captain holds this office informally pending substrate-driven dispatch.
