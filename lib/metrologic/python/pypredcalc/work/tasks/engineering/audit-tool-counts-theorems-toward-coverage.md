---
title: "Audit tool counts theorems toward coverage"
type: task
slug: audit-tool-counts-theorems-toward-coverage
status: completed
horizon: done
requires-capability: running-corpus-binding-audit
goal: extend-audit-to-count-theorem-coverage
created-by: pypredcalc-corpus-tracker
---

# Audit tool counts theorems toward coverage

## Description

Modify `governance/skills/running-corpus-binding-audit/audit.py` to count theorem realizations
(`@realizes("theorems/...")`) toward coverage stats — currently only objects, morphisms,
and concepts appear. Also include examples (`@realizes("examples/...")`) and any other
corpus-atom types that appear in the corpus tree but are missed by the current count.

## Acceptance

- [x] `audit.py` enumerates corpus atoms across all types under
      `theories/.../predication-categories/`: `concepts/`, `objects/`, `morphisms/`,
      `theorems/`, `examples/` (and others if present).
- [x] Coverage report shows per-type stats: `objects: M/N`, `morphisms: M/N`,
      `concepts: M/N`, `theorems: M/N`, `examples: M/N`.
- [x] Running on the current 0.3 codebase shows the realized theorems
      (`beck-chevalley-commutation-on-predication-bilattices`,
      `lawvere-comprehension-classical`, `lawvere-comprehension-paraconsistent`,
      `closure-algebras-are-c-closed`, `closure-algebra-coalgebra-correspondence`).
- [x] Existing audit tests still pass. (No dedicated audit-tool tests exist; the
      change is data-only — widening `ATOM_TYPES` — and leaves slug-resolution
      semantics intact.)

## References

- Goal: [`extend-audit-to-count-theorem-coverage`](../../goals/extend-audit-to-count-theorem-coverage.md).
- Audit tool: `governance/skills/running-corpus-binding-audit/audit.py`.

## Resolution

`ATOM_TYPES` widened to `("concepts", "objects", "morphisms", "theorems",
"examples")`; `RESOLVABLE_TYPES` becomes `(*ATOM_TYPES, "questions")`. README
and module docstring updated. Audit on 0.3 now reports per-type coverage
including `theorems 5 / 243` and `examples 0 / 83`, overall 32 / 484 (6%). The
five 0.3-era realized theorems are correctly counted; the broken
`theorems/dispatch-as-closure-rule-system` slug is reported as broken (not
covered).
