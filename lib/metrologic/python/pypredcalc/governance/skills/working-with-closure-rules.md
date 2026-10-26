---
name: "Working with closure rules"
description: "Designs FiberClosureRuleSystem and StoreClosureRuleSystem instances, classifies their regime, builds closures and settlings. Use when adding rule-driven calculator features."
---

# Working with closure rules

## Requirements

- Predication-specialist office.
- A hyperdoctrine to operate over.

## Steps

1. **Decide the rule shape**:
   - Fiber level (`FiberClosureRule`): cell atoms `v(q)(s,o) ≥_k V` with free-variable
     instantiation and optional ∀-block. Full corpus rule language.
   - Store level (`StoreRule`): grounded `((s, p, o), BilatticeValue)` antecedents and
     consequents. Observation-side ergonomics.
2. **Build the rule(s)** with `FiberClosureRule(free_vars, forall_vars, antecedent,
   consequent)` or `StoreRule(antecedents, consequents)`.
3. **Classify the regime**: `is_quantifier_free` on each rule. All quantifier-free →
   Scott-continuous; any ∀-block → potentially non-Scott-continuous.
4. **Build the system** and generate the closure:
   ```python
   system = FiberClosureRuleSystem(rules=(rule1, rule2))
   cl = system.generate(hyperdoctrine)
   ```
5. **Run a settling**:
   ```python
   settling = settle_from_rule_system(H, system, initial_valuation, bound=10)
   ```
6. Inspect `settling.is_quiescent`, `settling.quiescence_ordinal`, `settling.regime`.

## Outcomes

A working closure operator and (optionally) a settled trajectory. The generated `cl`
satisfies the corpus's closure-operator axioms by construction; the settling is
inflationary, idempotent, and 𝒞-natural.
