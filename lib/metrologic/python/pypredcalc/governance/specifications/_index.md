---
title: "PyPredCalc specifications"
type: index
status: open
---

# PyPredCalc specifications

Standing specifications for PyPredCalc's interfaces and contracts. A specification binds
module shape, API surface, output guarantees, or protocol details. Specifications differ
from [decisions](../decisions/) — a decision is a *trade-off settled at one moment in time*;
a specification is a *shape that future work must conform to*. Decisions justify
specifications; specifications constrain implementation.

## Active

| Slug | What |
|---|---|
| [`public-api-stability-tiers`](public-api-stability-tiers.md) | Two-tier stability model: Stable surface follows semver compatibility; Provisional surface may break in any minor release. |
| [`work-dispatch-readiness`](work-dispatch-readiness.md) | Four-valued dispatch-readiness witness over goals, tasks, offices; brief / dependency / capability / authority / capacity cell schema; selection rule with prep-advancement tiebreak. Supersedes `work-prioritization`. |

## Superseded

| Slug | Superseded by | What |
|---|---|---|
| [`work-prioritization`](work-prioritization.md) | [`work-dispatch-readiness`](work-dispatch-readiness.md) | v0.1 — slug-tiebreak / two-valued readiness / unintegrated brief precondition. |

## Anticipated

- `corpus-slug-format.md` — the slug-shape contract `governance/skills/running-corpus-binding-audit/audit.py` enforces.
- `release-process.md` — version-bump semantics, CHANGELOG discipline, deprecation window.
- `module-contracts.md` — per-subpackage promises about exported names.
