---
title: "Duties"
type: index
status: open
---

# Duties

Duty records encode constraints on power exercises. When an office exercises power X,
duty Y fires — the required action must be completed or the exercise is a substrate
violation.

Duties are **Type N→N** closure rules in PredWork's normative-operational layering:
antecedent reads normative cells (the power is held), consequent writes normative cells
(the duty-active cell is set), which then gates the operational event via N→O rules.

All records use `type: jural-relation, kind: duty` per
[`governance-records-use-jural-relation-schema`](../decisions/governance-records-use-jural-relation-schema.md).

## Constitutive duties (derived from hard-core C)

These duties ARE the constitutive commitments of the charter, expressed as constraints on
the powers that could violate them:

| Slug | Holder | What it requires |
|---|---|---|
| [`decorate-every-realization`](decorate-every-realization.md) | developer + specialists | C1: every Python entity realizing a corpus atom carries `@realizes`. |
| [`use-fraction-arithmetic-in-core`](use-fraction-arithmetic-in-core.md) | developer + specialists | C2: core arithmetic uses `fractions.Fraction`, not float. |
| [`avoid-runtime-deps-in-core`](avoid-runtime-deps-in-core.md) | developer + specialists | C2: no runtime deps beyond stdlib; sympy only behind `[symbolic]`. |
| [`return-witness-for-structural-claims`](return-witness-for-structural-claims.md) | developer + specialists | C3: structural claims return frozen-dataclass witnesses, not bools. |
| [`preserve-public-api-stability`](preserve-public-api-stability.md) | developer + specialists | C4: Stable surface follows semver compatibility; Provisional may break. |

## Workflow duties

| Slug | Holder | What it requires |
|---|---|---|
| [`consult-corpus-before-encoding`](consult-corpus-before-encoding.md) | records-officer | Read existing records and study the corpus before writing a new governance record. |
| [`realize-from-corpus-before-coding`](realize-from-corpus-before-coding.md) | developer + specialists | Read the corpus entity before writing the realization; cite the slug in docstring. |
| [`produce-brief-before-recommending-realization`](produce-brief-before-recommending-realization.md) | corpus-reader | Write a realization brief before the developer is dispatched on atoms warranting deep reading. |
| [`write-realization-claim-test`](write-realization-claim-test.md) | test-author | Every public realization gets a test exercising its corpus atom's defining property. |
| [`write-property-test-for-structural-claim`](write-property-test-for-structural-claim.md) | test-author | Witness-returning functions get hypothesis-driven property tests under `tests/property/`. |
| [`write-tests-for-public-surface`](write-tests-for-public-surface.md) | developer | Every new public name ships with unit tests. |
| [`use-frozen-dataclasses`](use-frozen-dataclasses.md) | developer + specialists | Value-bearing classes are `@dataclass(frozen=True)`. |
| [`enforce-mypy-strict`](enforce-mypy-strict.md) | quality-officer | Gate merge closed when `mypy --strict` reports errors. |
| [`enforce-ruff-clean`](enforce-ruff-clean.md) | quality-officer | Gate merge closed when `ruff check` reports violations. |
| [`review-before-merge`](review-before-merge.md) | quality-officer | Every merge-eligible change gets a verdict before merge gate opens. |
| [`witness-every-classification`](witness-every-classification.md) | executive-officer | Every routing/dispatch/triage decision produces a witness; no silent drops. |
| [`close-execution-loops`](close-execution-loops.md) | executive-officer | Every dispatched task gets a completion or stall classification. |
| [`witness-hard-core-amendments`](witness-hard-core-amendments.md) | steward | Every C-amendment produces a novation witness; non-delegable. |
| [`maintain-corpus-tracking-loop-integrity`](maintain-corpus-tracking-loop-integrity.md) | corpus-tracker | Run periodic coverage audits; file degeneration signals when found. |
| [`escalate-corpus-gap-found`](escalate-corpus-gap-found.md) | developer + specialists | If a corpus atom cannot be realized due to corpus inconsistency, file a question upstream rather than backfill. |
| [`follow-stability-tier-rules-on-release`](follow-stability-tier-rules-on-release.md) | release-officer | Match version-bump category to actual changes per stability tiers. |
| [`manage-deprecation-window`](manage-deprecation-window.md) | release-officer | Maintain at least one minor-release window between marking and removing a deprecated Stable name. |
| [`write-changelog-narrative`](write-changelog-narrative.md) | release-officer | CHANGELOG entries include a math-reader leap-narrative. |
| [`write-prose-for-public-surface`](write-prose-for-public-surface.md) | docs-officer | Substantive new public surface gets prose explanation within the next release window. |
| [`maintain-subpackage-coherence`](maintain-subpackage-coherence.md) | any subpackage specialist | Modifications preserve the subpackage's mathematical axioms. |
| [`preserve-naturality-on-fiber-changes`](preserve-naturality-on-fiber-changes.md) | predication-specialist | Modifications to fiber operations check 𝒞-naturality before commit. |
| [`surface-friction-as-governance-revision`](surface-friction-as-governance-revision.md) | any office | Surface execution friction (powers misfit, duties misfire, skills miss steps) as a revision intent. |
| [`tasks-requiring-brief-have-brief-cell-and-file`](tasks-requiring-brief-have-brief-cell-and-file.md) | records-officer | A task with `requires-brief: true` carries `brief:` *and* the file exists; otherwise readiness is $\bot$. |
| [`tasks-cite-dependencies-in-depends-on-cell`](tasks-cite-dependencies-in-depends-on-cell.md) | records-officer | Tasks whose realisation requires another task to be `done` first cite that dependency in `depends-on:`. |
| [`dispatch-readiness-is-computed-not-declared`](dispatch-readiness-is-computed-not-declared.md) | executive-officer | The XO derives readiness from the substrate via `computing-dispatch-readiness` before dispatch; declared `status: ready` is informational only. |

## Superseded

| Slug | Superseded by |
|---|---|
| [`goals-and-tasks-carry-prioritization-cells`](goals-and-tasks-carry-prioritization-cells.md) | the three duties above (brief / depends-on / readiness-computed) |

## Lifecycle

A duty's lifecycle is its `triggering-powers` list. When any of those powers is exercised
by the duty's `active-holder`, the `required-action` MUST be completed before the
operational event commits. Pre-`pyfars run pypredcalc/`, this is manual; post-substrate-
automation, the closure rule system enforces N→N → N→O gating automatically.
