---
title: "Fiber-level and store-level closure-rule systems coexist"
type: decision
slug: fiber-and-store-rule-systems-coexist
status: committed
date: "2026-05-08"
hard-core: math-floor-for-substrates-commitment
---

# Fiber-level and store-level closure-rule systems coexist

## What

PyPredCalc ships **two** closure-rule-system surfaces, both first-class and both supported:

1. **Fiber-level** (`pypredcalc.predication.closure_rule` +
   `pypredcalc.predication.closure_rule_system`): the corpus rule language at the
   predication-fiber-algebra level. `CellAtom` is `v(q)(s, o) ≥_k V`, atoms compose via
   positive Boolean (`And`, `Or`), rules carry free-variable instantiation and an optional
   `∀`-block, and `FiberClosureRuleSystem.generate(hyperdoctrine)` builds a
   `CrossFiberClosureOperator`. Realises corpus `concepts/closure-rule`,
   `concepts/closure-rule-system`, and `concepts/closure-rule-language`.

2. **Store-level** (`pypredcalc.predication.store_closure`): the
   `(subject, predicate, object) → BilatticeValue` flat-store presentation, with
   `StoreRule(antecedents, consequents)` whose atoms are grounded `((s, p, o), BilatticeValue)`
   pairs. `StoreClosureRuleSystem.forward_trajectory(store)` runs Kleene iteration over a
   `PredicationStore` directly. Realises the same corpus `concepts/closure-rule` and
   `concepts/closure-rule-system` at the observation-side presentation.

Neither surface is deprecated; both are supported indefinitely.

A third option — propositional `combinatorics.ClosureRuleSystem` (state is
`frozenset[Hashable]`) — predates 0.3 and remains for the strict-regime FOUR collapse case.
It is *not* a member of the predication closure family; its rules cannot carry bilattice
values. We retain it for the existing simplicial-complex / poset / forward-trajectory work
under `combinatorics`.

## Why

The corpus rule language is naturally fiber-level: cell atoms are over `dom(p) ⊆ E × E`, rules
use free-variable instantiation, the four-regime dichotomy reads off antecedent quantifier
shape. That presentation is correct and complete for the corpus, and it composes with the
hyperdoctrine, the closure 2-monad, and the parameter-base machinery — the whole predication
calculus stack lives at the fiber level.

But pyfars (and other downstream substrates) ingest data flat — `(subject, predicate, object)`
triples valued in FOUR. Forcing every consumer to round-trip through
`store_to_fibers` / `fibers_to_store` whenever they want to write a rule is friction with no
mathematical benefit. The store-level surface gives them direct ergonomic access to the same
semantics: atoms with `≥_k V` matching, knowledge-monotone composition on collisions.

Both surfaces realise *the same corpus concepts*. The corpus does not distinguish
"fiber-level rule" from "store-level rule" — those are presentations of one underlying
semantics. PyPredCalc preserves this by binding both to the same corpus slugs.

## Rules out

- Removing one of the two surfaces in favour of the other. Each serves a distinct caller
  (corpus-faithful work uses the fiber level; observation-side ingest uses the store level).
- Introducing a *third* presentation (e.g., a SQL-shaped rule language) without an explicit
  decision. Two presentations is the right number; the lift from one to two was load-bearing,
  the lift to three would need a new consumer driving it.
- Reverse-deprecating the propositional `combinatorics.ClosureRuleSystem`. It does *not*
  realise the predication closure-rule corpus; it serves a different (set-monotone) use case.
  The combinatorics module's docstring should be updated to clarify the relationship; deletion
  is not on the table.

## Does not constrain

- Whether the store-level surface gains new features the fiber-level surface lacks (e.g.,
  string-shorthand parsing, SQL-shaped queries). Such additions are themselves new decisions,
  but they are *not* prohibited by the coexistence stance.
- Whether the fiber-level surface gains new atom forms (e.g., twist-product fusion antecedents
  for the `dispatch-as-closure-rule-system` theorem). The corpus may yet extend the rule
  language; pypredcalc tracks the extension at the fiber level first, then mirrors at the
  store level.
- Internal sharing of code between the two surfaces. The store-level surface might come to
  use the fiber-level machinery under the hood (via the bridge); that's an implementation
  choice, not a governance one.
