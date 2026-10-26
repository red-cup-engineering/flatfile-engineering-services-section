---
name: "Working with propositional closure rules"
description: "Designs combinatorics.ClosureRuleSystem instances on propositional state, computes forward trajectories and cosettlings. Use for the strict-regime FOUR-collapse case."
---

# Working with propositional closure rules

## Requirements

- Combinatorics-specialist office.
- A propositional state space (a `frozenset[Hashable]` of cells).

## Steps

1. Build `Rule(antecedents, consequents)` instances. Both antecedents and consequents are
   tuples of cell identifiers.
2. Compose into `ClosureRuleSystem(rules, universe)`.
3. Run forward: `system.forward_trajectory(seed_state, max_steps=N)` produces the
   trajectory as a list of states.
4. Run backward (cosettling): `system.cosettling(target_state)` produces all states `v ⊆
   target` with `cl(v) = target`.

## When to use propositional rules vs. bilattice-valued

- **Propositional**: every cell is "present or absent"; consequents are presence-only;
  the strict-regime FOUR collapse where every fired atom is `T` and every absent cell is
  `⊥`. Sufficient for ordering theorems and presence-only inferences.
- **Bilattice-valued**: cells carry `BilatticeValue`; consequents can emit `F`
  (disqualification); two rules emitting `T` and `F` on the same cell knowledge-join to
  `⊤`. Per
  [`fiber-and-store-rule-systems-coexist`](../decisions/fiber-and-store-rule-systems-coexist.md),
  use the `predication.store_closure` or `predication.closure_rule_system` for these.

## Outcomes

A working propositional closure system; trajectories and cosettlings on demand. The
existing `tests/test_closure_rule.py` exercises this skill.
