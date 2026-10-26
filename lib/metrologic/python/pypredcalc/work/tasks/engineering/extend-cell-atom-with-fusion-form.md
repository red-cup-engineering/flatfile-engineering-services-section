---
title: "Extend CellAtom with fusion form"
type: task
slug: extend-cell-atom-with-fusion-form
status: completed
horizon: done
requires-capability: working-with-closure-rules
goal: add-twist-product-fusion-antecedents
created-by: pypredcalc-corpus-tracker
corpus-slug: theorems/dispatch-as-closure-rule-system
---

# Extend CellAtom with fusion form

## Description

Extend `predication.closure_rule` with antecedent atoms of the form
`v(p)(s, o) ⊙ v(q)(s, o) ≥_t V` — twist-product fusion as the antecedent's composition
operator. Two designs to consider:

1. **Sibling type**: introduce `FusionAtom(predicate_a, predicate_b, subject, object_,
   threshold)` alongside the existing `CellAtom`. `Formula` becomes
   `Union[CellAtom, FusionAtom, And, Or]`. Cleaner type-wise; more verbose at
   construction site.
2. **Sum field on CellAtom**: extend `CellAtom` with an optional `fused_predicate:
   Hashable | None` field. When set, the atom evaluates as the fusion. More compact;
   muddier semantics.

Pick (1) for cleanliness. Document the choice in the docstring.

The threshold uses `≥_t` (truth order), per the corpus theorem; existing cell-atoms use
`≥_k` (knowledge order). Document this distinction.

## Acceptance

- [x] `predication.closure_rule.FusionAtom` dataclass with `predicate_a`,
      `subject_a`, `object_a`, `predicate_b`, `subject_b`, `object_b`, `threshold`
      fields. (Per-side subject/object terms, generalised from the spec's single
      `subject`/`object_`, so two atoms over different cells can be fused.)
- [x] `FusionAtom.evaluate(valuation, env, bilattice)` computes
      `v[a].get(s_a, o_a) ⊙ v[b].get(s_b, o_b)` and checks `≥_t threshold`.
- [x] `Formula` union extended; `And` / `Or` accept `FusionAtom` as a part.
- [x] `collect_atom_variables` updated to walk both sides of a fusion atom.
- [x] Tests in `tests/test_fusion_atoms.py`:
      - Unit: fusion-atom evaluation on representative inputs (fires when fused
        meets threshold; does not fire when one input is F; collects variables
        from both sides).
      - Realization-claim: dispatch-eligibility rule fires correctly with a
        fusion antecedent (`TestDispatchEligibilityRule`, three cases).
- [x] Public API export from `predication/__init__.py` (line 67, 140).

## References

- Corpus: `theorems/dispatch-as-closure-rule-system` (in
  predicated-computing/agential-orchestration-platform).
- Inbox: `inbox/closure-rule-system-over-bilattice-valued-store.md` — pyfars's deferred
  ask.
- Goal: [`add-twist-product-fusion-antecedents`](../../goals/add-twist-product-fusion-antecedents.md).
