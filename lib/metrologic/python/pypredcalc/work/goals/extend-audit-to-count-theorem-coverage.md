---
title: "Extend audit to count theorem coverage"
type: goal
slug: extend-audit-to-count-theorem-coverage
status: met
horizon: done
theory-basis:
  - corpus-realization-binding-commitment
tasks:
  - audit-tool-counts-theorems-toward-coverage
---

# Extend audit to count theorem coverage

The corpus-binding audit (`governance/skills/running-corpus-binding-audit/audit.py`) currently reports coverage
for `objects/`, `morphisms/`, `concepts/` but not `theorems/`. The 0.3 release added
several new `@realizes("theorems/...")` decorations (Beck-Chevalley, Lawvere
comprehensions, closure-algebras-are-c-closed, closure-algebra-coalgebra-correspondence)
that don't appear in the coverage stats. This is a tooling gap — the realizations exist
and are correctly bound; the audit just doesn't count them.

## Theory grounding

C1 (corpus realization binding) is constitutive. The audit is the binding's substrate
verification. A binding the audit doesn't see is, from the substrate's perspective,
unverified — even when the decoration is correctly applied. Counting theorem realizations
toward coverage is what makes the binding visible to governance.

## Acceptance

- [x] `governance/skills/running-corpus-binding-audit/audit.py` reports per-type coverage including theorems,
      examples, and any other corpus-atom types currently filed as "uncounted."
- [x] The audit's coverage summary lists realized theorems alongside realized objects
      and morphisms.
- [x] Running the audit on the current 0.3 codebase shows ≥5 realized theorems
      (Beck-Chevalley, both Lawvere comprehensions, closure-algebras-are-c-closed,
      closure-algebra-coalgebra-correspondence — the ones the 0.3 work added).

## Resolution

`ATOM_TYPES` widened to include `theorems` and `examples`; `RESOLVABLE_TYPES`
narrowed to add only `questions` on top. Audit on 0.3 now reports
`theorems 5 / 243` and `examples 0 / 83`, with coverage at 32 / 484 (6%). The
five expected theorem realizations (Beck-Chevalley, both Lawvere
comprehensions, closure-algebras-are-c-closed,
closure-algebra-coalgebra-correspondence) all count. The
`theorems/dispatch-as-closure-rule-system` realisation in
`store_closure.dispatch_eligibility_rule` remains broken — corpus file
absent — and is correctly reported as a broken slug, not a coverage hit.
