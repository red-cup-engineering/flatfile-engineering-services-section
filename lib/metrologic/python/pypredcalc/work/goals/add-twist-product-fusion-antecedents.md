---
title: "Add twist-product fusion antecedents"
type: goal
slug: add-twist-product-fusion-antecedents
status: met
horizon: done
theory-basis:
  - theorems/dispatch-as-closure-rule-system
  - morphisms/twist-product-fusion
  - concepts/closure-rule-language
source: inbox/closure-rule-system-over-bilattice-valued-store.md
tasks:
  - extend-cell-atom-with-fusion-form
  - mirror-fusion-antecedent-on-store-rule
  - realize-dispatch-as-closure-rule-system
---

# Add twist-product fusion antecedents

The closure-rule language currently supports only single-cell antecedents
`v(p)(s, o) ≥_k V`. The corpus theorem `dispatch-as-closure-rule-system` requires
antecedents of the form `v(p)(s, o) ⊙ v(q)(s, o) ≥_t V` — twist-product fusion as the
antecedent's composition operator. Pyfars flagged this as deferred in the inbox inquiry
[`closure-rule-system-over-bilattice-valued-store`](../inbox/closure-rule-system-over-bilattice-valued-store.md);
this goal closes that gap.

## Theory grounding

The corpus's `theorems/dispatch-as-closure-rule-system` (in the
predicated-computing/agential-orchestration-platform tree) characterizes dispatch
eligibility as a closure-rule system over predication cells. The eligibility rule has
the form `capability(a) ⊙ required_cap(w) ≥_t threshold` — fusion of two cells'
positive evidence, compared to a truth threshold. Without fusion antecedents, this
theorem cannot be realized as a single rule; it requires multi-rule decomposition that
loses the theorem's content.

## Acceptance

- [x] Sibling `FusionAtom` added in `predication.closure_rule` supporting
      `v(p_a)(s_a, o_a) ⊙ v(p_b)(s_b, o_b) ≥_t V`. (Generalised from the
      shared-cell form in the original spec; per-side subject/object terms.)
- [x] Mirror at the store level: `predication.store_closure.StoreFusionAntecedent`
      and `StoreRule` accept fusion-atom antecedents.
- [x] Tests covering: (1) fusion-antecedent semantics on `boolean_twist`
      (`tests/test_fusion_atoms.py::TestFusionAtomEvaluation`,
      `TestStoreFusionAntecedent`), (2) the dispatch-as-closure-rule-system
      theorem realised as a single rule via `dispatch_eligibility_rule`
      (`TestDispatchEligibilityRule`, three cases).
- [x] `@realizes("theorems/dispatch-as-closure-rule-system")` decoration on
      `dispatch_eligibility_rule` (`store_closure.py:210`).
- [x] CHANGELOG entry under the new `Unreleased` section, naming the
      `FusionAtom` shape and the realised theorem.

## Resolution

All four sub-tasks landed (`extend-cell-atom-with-fusion-form`,
`mirror-fusion-antecedent-on-store-rule`,
`realize-dispatch-as-closure-rule-system`, plus the CHANGELOG entry). The
fusion-antecedent surface is live across both the fiber-level and the
store-level rule languages, and the dispatch eligibility rule is realised
as a single fusion-antecedent rule. 14 tests in `tests/test_fusion_atoms.py`
pass.

The audit's broken-slug report on `theorems/dispatch-as-closure-rule-system`
remains: the corpus file lives in
`predicated-computing/agential-orchestration-platform/theorems/`, not in
the math `predication-categories/theorems/` tree the audit walks. This is
an audit-tool gap — the realisation is correctly bound; the audit just
doesn't follow `@realizes` slugs into adjacent corpus trees. Filed as a
separate backlog item for the audit.

## Why now

The inbox inquiry's "Meanwhile" section says pyfars has been "doing the closure loop
directly over `PredicationStore` in pyfars, T-only consequents." That's a private
parallel of work that should live in pypredcalc. Closing the gap unblocks pyfars's
dispatch eligibility realizations and removes a duplication.
