---
title: "Write PyPredCalc source code"
type: jural-relation
kind: power
slug: write-pypredcalc-source
active-holder: pypredcalc-developer
passive-party: pypredcalc-community
scope-action: create-or-modify-src-files
scope: src/
correlate-of: liability
duties:
  - decorate-every-realization
  - use-fraction-arithmetic-in-core
  - avoid-runtime-deps-in-core
  - return-witness-for-structural-claims
  - preserve-public-api-stability
  - use-frozen-dataclasses
  - realize-from-corpus-before-coding
  - write-tests-for-public-surface
enables-skills: [realizing-corpus-atom-as-python, running-test-suite]
theory-basis: [jural-relation, normative-operational-layering, formality-layer, charter-as-closure-system]
---

# Write PyPredCalc source code

The developer may create or modify files under `src/` (and the corresponding tests under
`tests/`). The community has a liability: code written in the exercise of this power
becomes the running implementation that PyFARS and other downstream substrates import — it
shapes what C1–C4 mean in execution.

## Scope

- `src/` — pypredcalc source code.
- `tests/` — corresponding test code (the developer holds write power on tests as well; tests
  are co-equal with source for the realization claim).
- `CHANGELOG.md` — release-note entries describing what the developer added.

The developer does NOT hold write power over:

- `governance/` — records-officer's domain.
- `theories/` — corpus is upstream.
- `work/goals/`, `work/specs/` — records-officer's domain.

The developer does hold a *limited* `create-task-record` power for breaking down realization
work into subtasks (per [`create-task-record`](create-task-record.md)).

## Constitutive duties

The eight duties listed in this record's `duties:` field encode hard-core C as constraints
on this power. The five constitutive duties (the C1–C4 derivations) are non-negotiable;
violating any of them is a substrate violation that audit machinery flags. See each duty's
record for required action.

## Formality-layer application

Per `formality-layer`, not every exercise of this power requires the same agent capability:

- **Script layer**: routine edits (rename, reformat, follow an existing pattern), CRUD on
  test fixtures, CHANGELOG entries.
- **Classifier layer**: structured pattern-following (a new realization that mirrors an
  existing template).
- **Frontier-model layer**: novel category-theoretic constructions, multi-fiber realizations,
  debugging cases where the corpus says what but not how.

Escalating to a higher formality layer than the task requires produces unnecessary cost.
Failing to escalate when the task requires judgment produces substrate violations.

## Immunity

The developer bears [`immunity-from-spec-violating-duty`](immunity-from-spec-violating-duty.md):
no office or task can require the developer to write code that violates the corpus, the
charter, or higher levels of the source-of-truth chain.
