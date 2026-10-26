---
title: "Offices"
type: index
status: open
---

# Offices

Office records define the governance roles that preside over PyPredCalc development. An
office holds powers, incurs duties, and provides skills. Personnel `holds(personnel, office)`
to inherit these. Per
[`governance-records-use-jural-relation-schema`](../decisions/governance-records-use-jural-relation-schema.md),
the powers / duties / privileges / immunities each office references live in
[`../powers/`](../powers/) and [`../duties/`](../duties/) as `type: jural-relation` records.

## The deck

Picture a deck on the ship: one corridor, rooms off it. Each room is a workspace where
specific labor happens. The corridor is the dispatch path; the XO routes work along it
into the right room.

## Governing offices (presiding)

Three offices govern in parallel under the captain. They share the captain as principal;
none commands the others.

| Slug | Role |
|---|---|
| [`pypredcalc-steward`](pypredcalc-steward.md) | Guards C; presides over novation; installs personnel. |
| [`pypredcalc-executive-officer`](pypredcalc-executive-officer.md) | Operational interface; routes inbox; dispatches work; closes execution loops. |
| [`pypredcalc-corpus-tracker`](pypredcalc-corpus-tracker.md) | Watches the predication-categories corpus; identifies realization gaps; runs the corpus-binding audit. |

## Functional offices (process work)

Five offices doing process labor — not bound to a single subpackage.

| Slug | Role |
|---|---|
| [`pypredcalc-corpus-reader`](pypredcalc-corpus-reader.md) | Deeply reads corpus atoms; produces realization briefs. |
| [`pypredcalc-developer`](pypredcalc-developer.md) | Implements realizations from briefs; writes Python source and `@realizes` decorations. |
| [`pypredcalc-test-author`](pypredcalc-test-author.md) | Writes unit and property tests against realizations. |
| [`pypredcalc-quality-officer`](pypredcalc-quality-officer.md) | Runs mypy/ruff; reviews changes; gates merge. |
| [`pypredcalc-records-officer`](pypredcalc-records-officer.md) | Creates and maintains governance and work records. |
| [`pypredcalc-release-officer`](pypredcalc-release-officer.md) | Version bumps, CHANGELOG, deprecation cycles, build/CI/nix. |
| [`pypredcalc-docs-officer`](pypredcalc-docs-officer.md) | Prose documentation, mkdocs, README. |

## Subpackage specialist offices (the labs)

Seven offices, one per math area, each owning realizations and tests for their subpackage.

| Slug | Subpackage |
|---|---|
| [`pypredcalc-algebra-specialist`](pypredcalc-algebra-specialist.md) | `pypredcalc.algebra` — bilattice, twist-product, residuated lattice. |
| [`pypredcalc-predication-specialist`](pypredcalc-predication-specialist.md) | `pypredcalc.predication` — fiber-valuations, predicate-category, hyperdoctrine, closure machinery, settling, monad/comonad, parameter-base. |
| [`pypredcalc-combinatorics-specialist`](pypredcalc-combinatorics-specialist.md) | `pypredcalc.combinatorics` — poset, simplicial complex, propositional closure rules. |
| [`pypredcalc-topology-specialist`](pypredcalc-topology-specialist.md) | `pypredcalc.topology` — Alexandrov, Priestley, transfinite cell complex. |
| [`pypredcalc-lattice-specialist`](pypredcalc-lattice-specialist.md) | `pypredcalc.lattice` — frames, frame morphisms, d-frames. |
| [`pypredcalc-sheaf-specialist`](pypredcalc-sheaf-specialist.md) | `pypredcalc.sheaf` — cellular sheaves, frame-valued sheaves, q-enriched sheaves, cohomology. |
| [`pypredcalc-dynamics-specialist`](pypredcalc-dynamics-specialist.md) | `pypredcalc.dynamics` — substitution matrices, named corpus instances. |

## Authority chain

```
561 polity → captain (emsenn) → pypredcalc-steward → pypredcalc-executive-officer → functional & specialist offices
                                                  ↘ pypredcalc-corpus-tracker (parallel governing peer)
```

Specialist offices report through the executive-officer alongside the functional offices.

## Incumbency

All offices are currently held informally by the captain plus contracted inference
sessions. Formal incumbency predications (recognition + induction per
`office-as-double-settlement`) are deferred to the substrate-driven `pyfars run pypredcalc/`
operational target — when incumbency-as-substrate-data becomes operationally load-bearing.
