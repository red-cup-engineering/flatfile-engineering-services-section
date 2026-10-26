---
title: "PyPredCalc governance"
type: index
status: open
---

# PyPredCalc governance

Project-development governance for PyPredCalc. PyPredCalc is a PyFARS instance — the
operational target is `pyfars run pypredcalc/`: autonomous agentic activity on pypredcalc
development, dispatched by the substrate machinery that runs PyFARS itself. So pypredcalc
carries the full agential governance apparatus the substrate expects.

Governance records bind future work; amending one is itself a governance act (a new
decision or specification that supersedes the prior shape).

## Contents

| Path | What it carries |
|---|---|
| [`charter.md`](charter.md) | The closure-rule system whose rules tier IS the enterprise's hard core C. Read first. |
| [`enterprise.md`](enterprise.md) | PyPredCalc as an enterprise `(C, Γ, O)` per the PredWork enterprise definition. |
| [`conventions.md`](conventions.md) | Record-format conventions: what records carry which frontmatter, status lifecycles, body format. |
| [`decisions/`](decisions/) | Architectural Decision Records (ADRs). What / Why / Rules-out / Does-not-constrain. |
| [`specifications/`](specifications/) | Specifications binding module shape, API contracts, output guarantees. |
| [`offices/`](offices/) | Office records — the governance roles. |
| [`powers/`](powers/) | Power, privilege, and immunity records — the active-side jural relations. |
| [`duties/`](duties/) | Duty records — constraints on power exercises. |
| [`skills/`](skills/) | Skill records — executable procedures that powers enable. |
| [`agents/`](agents/) | Agent records — LLM-backed and unix-tool incumbents of offices. |

## Hard core C — the four constitutive commitments

(Per [`charter.md`](charter.md). Abandoning any one of these would terminate pypredcalc as
*this* enterprise.)

- **C1 — Corpus realization binding.** Every realizing Python entity carries an
  `@realizes("type/slug")` decoration; binding direction is Python → theory.
- **C2 — Pure-math substrate.** `fractions.Fraction` arithmetic, no float in core, sympy
  only behind the `[symbolic]` extra.
- **C3 — Witness-style structural returns.** Predication-categorical claims with structure
  return frozen-dataclass witnesses, not bare bools.
- **C4 — Math floor for substrates.** Public API stability matters: PyFARS and
  predicated-computing realizations import this floor.

## Operative structure O — seventeen offices

The deck has one corridor; off it, rooms where work happens. See
[`offices/_index.md`](offices/_index.md) for the full crew.

**Governing** (3): [`steward`](offices/pypredcalc-steward.md),
[`executive-officer`](offices/pypredcalc-executive-officer.md),
[`corpus-tracker`](offices/pypredcalc-corpus-tracker.md).

**Functional** (7): [`corpus-reader`](offices/pypredcalc-corpus-reader.md),
[`developer`](offices/pypredcalc-developer.md),
[`test-author`](offices/pypredcalc-test-author.md),
[`quality-officer`](offices/pypredcalc-quality-officer.md),
[`records-officer`](offices/pypredcalc-records-officer.md),
[`release-officer`](offices/pypredcalc-release-officer.md),
[`docs-officer`](offices/pypredcalc-docs-officer.md).

**Subpackage specialists** (7): [`algebra`](offices/pypredcalc-algebra-specialist.md),
[`predication`](offices/pypredcalc-predication-specialist.md),
[`combinatorics`](offices/pypredcalc-combinatorics-specialist.md),
[`topology`](offices/pypredcalc-topology-specialist.md),
[`lattice`](offices/pypredcalc-lattice-specialist.md),
[`sheaf`](offices/pypredcalc-sheaf-specialist.md),
[`dynamics`](offices/pypredcalc-dynamics-specialist.md).

## Decisions committed

| Slug | What |
|---|---|
| [`corpus-binding-via-realizes-decoration`](decisions/corpus-binding-via-realizes-decoration.md) | The Python → theory binding direction. |
| [`witness-style-returns-for-structural-claims`](decisions/witness-style-returns-for-structural-claims.md) | Structural claims return witnesses, not bools. |
| [`exact-arithmetic-only-fractions-not-floats`](decisions/exact-arithmetic-only-fractions-not-floats.md) | `fractions.Fraction` only in core. |
| [`fiber-and-store-rule-systems-coexist`](decisions/fiber-and-store-rule-systems-coexist.md) | Both fiber-level and store-level closure-rule surfaces ship. |
| [`governance-records-use-jural-relation-schema`](decisions/governance-records-use-jural-relation-schema.md) | Powers / duties / privileges / immunities use `type: jural-relation` with `kind:` sub-classifier. |
| [`work-dispatch-readiness-as-bilattice-valued-section`](decisions/work-dispatch-readiness-as-bilattice-valued-section.md) | Four-valued dispatch readiness as the substrate-derived selection rule; supersedes the v0.1 horizon-cells ADR. |

## Specifications active

| Slug | What |
|---|---|
| [`public-api-stability-tiers`](specifications/public-api-stability-tiers.md) | Two-tier stability (Stable / Provisional); pre-1.0 default is Provisional. |
| [`work-dispatch-readiness`](specifications/work-dispatch-readiness.md) | Four-valued dispatch readiness witness; cell schema with brief/dependency/capability/authority preconditions; selection rule with prep-advancement tiebreak. |

## Source-of-truth ordering

When sources disagree, the lower-numbered source wins:

1. `theories/.../predication-categories/` — the corpus, the math.
2. [`charter.md`](charter.md) — hard core C.
3. [`enterprise.md`](enterprise.md) — current (C, Γ, O).
4. [`decisions/`](decisions/) — committed ADRs.
5. [`specifications/`](specifications/) — module/API contracts.
6. [`offices/`](offices/), [`powers/`](powers/), [`duties/`](duties/), [`skills/`](skills/),
   [`agents/`](agents/) — the agential apparatus.
7. [`conventions.md`](conventions.md) — record-format conventions.
8. `work/` — work records.
9. `src/` — source code.
