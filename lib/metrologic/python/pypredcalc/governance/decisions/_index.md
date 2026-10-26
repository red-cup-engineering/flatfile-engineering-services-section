---
title: "PyPredCalc decisions"
type: index
status: open
---

# PyPredCalc decisions

Architectural Decision Records (ADRs) for PyPredCalc. Each decision is `<slug>.md` with
frontmatter `type: decision, status: committed|superseded, slug: <slug>` and a body in
the **What / Why / Rules-out / Does-not-constrain** pattern (per
[`../charter.md`](../charter.md) instructions tier).

A decision binds future work. It can be amended only by another decision (mark the old
one `status: superseded`, name the superseder, write a new ADR explaining why). Decisions
override conventions when they conflict.

## Committed

| Slug | What |
|---|---|
| [`corpus-binding-via-realizes-decoration`](corpus-binding-via-realizes-decoration.md) | The Python → theory binding direction. `@realizes("type/slug")` is authoritative; corpus `python:` frontmatter is *not* the binding. |
| [`witness-style-returns-for-structural-claims`](witness-style-returns-for-structural-claims.md) | Predication-categorical claims with structure return frozen-dataclass witnesses, not bare bools. |
| [`exact-arithmetic-only-fractions-not-floats`](exact-arithmetic-only-fractions-not-floats.md) | Core code uses `fractions.Fraction`. No floating-point in core. |
| [`fiber-and-store-rule-systems-coexist`](fiber-and-store-rule-systems-coexist.md) | Two parallel rule-system surfaces: fiber-level (corpus-shape) and store-level (consumer-shape). Both ship; neither is deprecated. |
| [`work-dispatch-readiness-as-bilattice-valued-section`](work-dispatch-readiness-as-bilattice-valued-section.md) | Commits to four-valued readiness witness, brief / dependency / capability / authority preconditions, prep-advancement tiebreak. Names six failure modes of the prior ADR. |

## Superseded

| Slug | Superseded by |
|---|---|
| [`work-prioritization-via-horizon-cells`](work-prioritization-via-horizon-cells.md) | [`work-dispatch-readiness-as-bilattice-valued-section`](work-dispatch-readiness-as-bilattice-valued-section.md) |
