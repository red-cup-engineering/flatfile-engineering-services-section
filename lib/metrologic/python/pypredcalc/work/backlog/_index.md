---
title: "PyPredCalc backlog"
type: index
status: open
---

# PyPredCalc backlog

Tasks not currently scheduled. Add records as `<slug>.md` with frontmatter `type: task, status: backlog`. When pulled into active work, move to `../tasks/`.

## Filed

- [`fix-predicate-naturality-stability-property-test`](fix-predicate-naturality-stability-property-test.md) —
  port the four naturality-stability property tests to the current
  `FiberValuation` / `EntitySet` / `pullback` surface; surfaced as a
  collateral observation while completing `add-property-tests-for-0-3-surface`.
- [`audit-resolves-cross-tree-realization-slugs`](audit-resolves-cross-tree-realization-slugs.md) —
  extend the corpus-binding audit to resolve realisation slugs that point
  into adjacent corpus trees (e.g.
  `theorems/dispatch-as-closure-rule-system` lives under
  predicated-computing/agential-orchestration-platform, not the
  predication-categories math tree).

## Unsupported-generalization seeds

The remaining `NotImplementedError` paths are scoped unsupported
generalizations, not claims that the algebra or predication SDK is still a
stub:

- Implement full transfinite/non-strict cosettling dynamics in
  `pypredcalc.dynamics.cosettling`.
- Implement non-trivial cover support for `pypredcalc.sheaf.q_enriched.cohomology`.
- Implement higher-rank `pypredcalc.sheaf.cellular.CellularSheaf` cohomology.

These should be turned into proper task records (one file each, citing the corpus reference each module's docstring names) before any of them is picked up.
