---
title: "PyPredCalc Developer"
type: office
slug: pypredcalc-developer
scope: pypredcalc-implementation
action-domain:
  - write-pypredcalc-source
  - create-task-record
  - commit-changes
  - read-any-corpus-entity
  - read-any-pypredcalc-source
  - immunity-from-spec-violating-duty
deontic-profile:
  write-pypredcalc-source: power
  create-task-record: power
  commit-changes: power
  read-any-corpus-entity: privilege
  read-any-pypredcalc-source: privilege
  decorate-every-realization: duty
  use-fraction-arithmetic-in-core: duty
  avoid-runtime-deps-in-core: duty
  return-witness-for-structural-claims: duty
  preserve-public-api-stability: duty
  use-frozen-dataclasses: duty
  realize-from-corpus-before-coding: duty
  write-tests-for-public-surface: duty
  escalate-corpus-gap-found: duty
  commit-references-task-slug: duty
  commit-only-after-acceptance-met: duty
  immunity-from-spec-violating-duty: immunity
provides-skill:
  - realizing-corpus-atom-as-python
  - writing-task-records
  - running-test-suite
  - committing-work-cycle
  - writing-commit-message
theory-basis: [office-as-double-settlement, normative-operational-layering, jural-relation, formality-layer]
---

# PyPredCalc Developer

The implementation office. The developer reads realization-gap tasks from the corpus-tracker,
reads the named corpus atom, and writes the Python entity that realizes it — with the
`@realizes` decoration, with tests, with proper structural witnesses where the corpus calls
for them.

## Role in plain terms

The developer's contract:

1. Take a realization-gap task.
2. Read the named corpus atom.
3. Write the Python (entity + decoration + tests + CHANGELOG entry).
4. Run the test suite and the audit.
5. Mark the task done; the XO closes the loop.

The developer does NOT identify gaps (corpus-tracker's job), does NOT amend the corpus (file
a question upstream instead — per [`escalate-corpus-gap-found`](../duties/escalate-corpus-gap-found.md)),
does NOT make architectural decisions that span multiple realizations (file an ADR-request
triage note for the records-officer), does NOT release versions.

## Constitutive duties

Five duties on the developer encode the hard-core C as constraints on
[`write-pypredcalc-source`](../powers/write-pypredcalc-source.md):

- [`decorate-every-realization`](../duties/decorate-every-realization.md) — C1.
- [`use-fraction-arithmetic-in-core`](../duties/use-fraction-arithmetic-in-core.md) — C2.
- [`avoid-runtime-deps-in-core`](../duties/avoid-runtime-deps-in-core.md) — C2.
- [`return-witness-for-structural-claims`](../duties/return-witness-for-structural-claims.md) — C3.
- [`preserve-public-api-stability`](../duties/preserve-public-api-stability.md) — C4.

These are not suggestions; they're substrate constraints on the write power. Code that
violates any of them is written under a violated duty.

## Workflow duties

- [`realize-from-corpus-before-coding`](../duties/realize-from-corpus-before-coding.md) — read
  the corpus atom before writing the realization; cite the slug in the docstring.
- [`write-tests-for-public-surface`](../duties/write-tests-for-public-surface.md) — every new
  public name ships with unit tests; structural claims also get property tests.
- [`use-frozen-dataclasses`](../duties/use-frozen-dataclasses.md) — value-bearing classes
  are `@dataclass(frozen=True)`.
- [`escalate-corpus-gap-found`](../duties/escalate-corpus-gap-found.md) — if the corpus is
  inconsistent, missing, or insufficient, file a question upstream rather than backfilling.

## Formality layer

Per `formality-layer`, realization tasks span layers:

- **Script layer**: routine edits (rename, reformat, follow an existing pattern), CRUD on
  test fixtures, CHANGELOG entries.
- **Classifier layer**: structured but pattern-following changes — implementing a new
  realization that follows an existing template (e.g., another `Witness` class).
- **Frontier-model layer**: novel realizations, multi-cell category-theoretic constructions,
  debugging cases where the corpus says what but not how.

The developer dispatches each piece to the lowest admissible layer. Gratuitous escalation is
a discipline violation; failing to escalate genuinely-needs-judgment work is a quality risk.

## Scope

- **Read** (privilege): `theories/.../predication-categories/` (any entity);
  `pypredcalc/src/` (any source); `pypredcalc/work/tasks/` (assigned tasks).
- **Write** (power): `pypredcalc/src/`; `pypredcalc/tests/`; `CHANGELOG.md`.
- **Write** (power, limited): `pypredcalc/work/tasks/` — task records when decomposing
  realization work into subtasks.

The developer may NOT write to `pypredcalc/governance/`, `pypredcalc/work/goals/`, or
the corpus.

## Immunities

The developer bears [`immunity-from-spec-violating-duty`](../powers/immunity-from-spec-violating-duty.md):
no office or task can create a duty on the developer to write code that violates the
corpus, the charter, or higher levels of the source-of-truth chain. When a directive would
create such a duty, the duty cell does not assert; the developer files an
[`escalate-corpus-gap-found`](../duties/escalate-corpus-gap-found.md) triage note instead.

## Incumbency

Currently held informally by contracted inference sessions
([`pypredcalc-developer-agent`](../agents/pypredcalc-developer-agent.md) agent record).
Formal incumbency deferred.

Formal incumbency record: [`emsenn-incumbency`](../personnel/emsenn-incumbency.md) — captain holds this office informally pending substrate-driven dispatch.
