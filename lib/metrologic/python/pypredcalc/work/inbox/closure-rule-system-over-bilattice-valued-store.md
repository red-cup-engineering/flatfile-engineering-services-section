---
title: "Closure-rule application over PredicationStore"
type: inquiry
status: answered
sender: pyfars
sent-at: 2026-05-08
answered-at: 2026-05-08
answer-module: pypredcalc.predication.store_closure
---

# Closure-rule application over PredicationStore

`combinatorics.ClosureRuleSystem` and `predication.PredicationStore`
sit one abstraction apart and don't compose. The closure-rule
machinery is propositional (state is `frozenset[Hashable]`); the
predication machinery is bilattice-valued (`(s,p,o) → BilatticeValue`,
knowledge-monotone insert). There's no closure-rule-system that
operates over PredicationStore.

Per `concepts/closure-rule-language`, antecedent atoms are
`v(q)(s₁,s₂) ≥_k V` lower-bound formulas in the predication-fiber
algebra, and consequents are `v'(p)(t₁,t₂) ≥_k V` cell-updates. The
combinatorics version is the boolean-twist collapse of this — every
atom is "≥_k T" implicitly, and the closure is set-monotone instead
of knowledge-monotone. That collapse loses three things we need:

1. **Bilattice-valued consequents.** The corpus's eligibility
   rules specify *t* on coverage, *f* on shortfall, *⊥* on
   unspecified (e.g. `objects/eligibility-by-capabilities`). The
   disqualification-rule category in
   `objects/dispatch-closure-rule-system` specifies explicit *f*
   consequents (rate-limit exhausted, charter-binding violated).
   `combinatorics.Rule` has no place to put a value on the
   consequent — only "this triple becomes present."

2. **Knowledge-monotone composition on cell collisions.** When
   two rules touch the same cell, `PredicationStore.insert`
   already does the right thing via `knowledge_join`. The
   combinatorics path doesn't see values, so it can't compose
   *t* and *f* into *⊤*, or detect that a fold is converging
   under `≤_k`. Federation and re-dispatch both rely on that
   composition behaving correctly.

3. **`≥_k V` antecedent atoms as the matching condition.** The
   dispatch theorem `theorems/dispatch-as-closure-rule-system`
   names twist-product fusion as the composition operator
   (`capability(a) ⊙ required_cap(w) ≥_t threshold`). Pypredcalc
   exposes `algebra.twist_product` but there's no rule-system
   that uses it as the antecedent's `⊙` and `≥_k V` as its match
   condition. We can build the fusion call by hand, but then
   we're outside the closure-operator framework — the result
   isn't a sub-rule-system, doesn't carry the regime-class
   guarantees, and doesn't compose with other rules under the
   theorem's axioms (the `closure-operator` axioms 1–4 in
   `morphisms/closure-operator`).

For the strict-regime FOUR case (which is what we're in: finite
agents, finite capabilities, finite workitems), the propositional
collapse is *almost* enough — every atom that fires reads as `T`,
every cell that doesn't is `⊥` by absence. What still doesn't
work in that collapse is positive emission of `F`. That's what
the disqualification-rule category needs and what we cannot
express today.

## A concrete example

```python
# Disqualification: rate-limit exhausted → eligibility F.
rule = Rule(
    antecedents=(("ep:groq", "rate-limit-remaining", "0"),),
    consequents=(("task:t", "eligible-by-capabilities", "ep:groq"),),
)
system = ClosureRuleSystem((rule,))
state = frozenset([("ep:groq", "rate-limit-remaining", "0")])
final = system.forward_trajectory(state)[-1]
# final contains the consequent triple — but as "present", not as F.
# Reading it back tells us it's eligible, exactly inverting the
# rule's intent. The fix is to attach BilatticeValue.F to the
# consequent and have the closure fold it into a PredicationStore
# via knowledge_join, but ClosureRuleSystem can't carry the value.
```

## What we want to be able to write

Pseudocode against a hypothetical primitive — exact name and
layering is yours to decide:

```python
rule = Rule(
    antecedents=(
        (("ep:groq", "rate-limit-remaining", "0"), BilatticeValue.T),
    ),
    consequents=(
        (("task:t", "eligible-by-capabilities", "ep:groq"),
         BilatticeValue.F),
    ),
)
system = ClosureRuleSystem((rule,))
final_store = system.forward_trajectory(some_predication_store)[-1]
# final_store carries (task:t, eligible-by-capabilities, ep:groq) = F.
# A second rule emitting T on the same cell would knowledge-join to ⊤,
# surfacing the contradiction the way the math wants.
```

The minimum that unblocks the eligibility/disqualification rule
specs is: rules whose **consequents** carry an explicit
`BilatticeValue` (or `≥_k V` element of the parameter base lattice),
applied to a `PredicationStore`, with `knowledge_join` semantics on
collision. That's narrower than the full `≥_k V` antecedent
generalization the closure-rule-language describes; the antecedent
side could stay set-membership for now if that's a smaller move.

## Meanwhile, on our side

Doing the closure loop directly over `PredicationStore` in pyfars,
T-only consequents, inferring `F`/`⊥` from cell absence. This
realizes the strict-T-eligibility path but not the disqualification
or contradiction-surfacing cases the corpus specs require, and the
loop is a private parallel of what should live here.

## References

- `concepts/closure-rule.md`
- `concepts/closure-rule-system.md`
- `concepts/closure-rule-language.md`
- `morphisms/closure-operator.md` (the four axioms)
- `morphisms/twist-product-fusion.md`
- `theorems/dispatch-as-closure-rule-system` (in the
  predicated-computing/agential-orchestration-platform tree;
  this is the consumer)

---

## Answer

Shipped in `pypredcalc.predication.store_closure` (released as part of
the calculator-surface 0.3 work). Public API:

```python
from pypredcalc import (
    StoreRule, StoreClosureRuleSystem,
    PredicationStore, BilatticeValue,
    PredicationCell,
)

T = BilatticeValue.T
F = BilatticeValue.F

rule = StoreRule(
    antecedents=(
        (("ep:groq", "rate-limit-remaining", "0"), T),
    ),
    consequents=(
        (("task:t", "eligible-by-capabilities", "ep:groq"), F),
    ),
)
system = StoreClosureRuleSystem(rules=(rule,))
final_store = system.forward_trajectory(some_predication_store)[-1]
# final_store.get("task:t", "eligible-by-capabilities", "ep:groq") == F
```

Semantics:

- **Antecedent atom** `((s, p, o), V)` is satisfied at a store `S` iff
  `S.get(s, p, o) ≥_k V` in the FOUR knowledge order. So a `T`
  antecedent is satisfied by `T` and `⊤` (and only those); a `⊤`
  antecedent is satisfied only by `⊤`; an empty antecedent tuple is an
  axiom that always fires.
- **Consequent atom** `((s, p, o), V)` commits `V` into the store via
  `PredicationStore.insert`, which already does `knowledge_join`. So
  two rules emitting `T` and `F` on the same cell produce `⊤` —
  contradiction-surfacing as the corpus calls for. A `BOT` consequent
  is a no-op.
- **Fixed-point iteration** via `forward_trajectory(store)` returns the
  list `[v_0, v_1, ..., v_n]` with `v_n` the closure. The system is
  inflationary, idempotent, and bounded by `|cells| · |FOUR|` rounds
  in the strict-FOUR case (default `max_iterations=10_000` covers
  realistic dispatch states comfortably).

Realises corpus `concepts/closure-rule` and
`concepts/closure-rule-system` at the observation-side
`(s, p, o) → BilatticeValue` presentation. The full ``≥_k V``
antecedent shape with free-variable instantiation lives at
`pypredcalc.predication.closure_rule.FiberClosureRule` if you ever
need to express a rule like `R(x, y) ∧ R(y, z) ⟹ R(x, z)` with cell
atoms over `dom(p) ⊆ E×E`; this `StoreRule` is the grounded shape
that's enough for eligibility / disqualification.

**Update (Phase 3, follow-up to original answer):** the
twist-product-fusion antecedent shipped:

- `predication.closure_rule.FusionAtom` — `v(p_a)(s_a, o_a) ⊙ v(p_b)(s_b, o_b) ≥_t threshold`
  at the fiber level, with full free-variable instantiation.
- `predication.store_closure.StoreFusionAntecedent` — the same atom at
  the flat-store presentation pyfars uses.
- `predication.store_closure.dispatch_eligibility_rule(...)` — convenience
  builder producing the corpus theorem's single-rule shape directly.
  `@realizes("theorems/dispatch-as-closure-rule-system")`.
- `algebra.bilattice.fusion(a, b)` — public FOUR fusion table, exposed for
  callers that want fusion outside the rule machinery.

Test: `tests/test_fusion_atoms.py` covering the fusion table (commutativity,
associativity, unit = ⊤, absorber = F, the consequence that BOT ⊙ BOT = F
which is the corpus's load-bearing non-integrality), the FusionAtom
evaluation at fiber level, the StoreFusionAntecedent at store level, and
the dispatch theorem realized as a single-rule store closure.

Tests at `tests/test_store_closure.py`:
- The exact pyfars disqualification example.
- Two-rule contradiction yielding `⊤`.
- `≥_k` threshold semantics (T satisfied by T or ⊤; not by BOT or F;
  ⊤ requires ⊤).
- Empty-antecedent axiom rule.
- Chained inference and idempotence on the trajectory.
