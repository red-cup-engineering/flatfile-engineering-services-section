---
title: "PyPredCalc Quality Officer"
type: office
slug: pypredcalc-quality-officer
scope: pypredcalc-code-quality
action-domain:
  - run-type-check
  - run-lint
  - review-change
  - request-revision
  - read-any-pypredcalc-source
deontic-profile:
  run-type-check: power
  run-lint: power
  review-change: power
  request-revision: power
  read-any-pypredcalc-source: privilege
  enforce-mypy-strict: duty
  enforce-ruff-clean: duty
  review-before-merge: duty
provides-skill:
  - running-mypy-strict
  - running-ruff
  - doing-code-review
  - gating-merge
theory-basis: [office-as-double-settlement, jural-relation, normative-operational-layering, formality-layer]
---

# PyPredCalc Quality Officer

The code-quality office. Runs `mypy --strict` against `src/`, runs `ruff` lint with the
project's rule set, performs code review on changes before they're merged, and gates merge
on quality.

## Role in plain terms

After the developer writes a realization and the test-author writes tests, the quality-
officer:

1. Runs `mypy --strict src/pypredcalc` — type discipline.
2. Runs `ruff check src/ tests/` — style and code-pattern lint.
3. Reads the diff and reviews — does the realization preserve the corpus's structure? Does
   the code follow the witness pattern where applicable? Are there obvious improvements?
4. Either:
   - **Approves** — the change passes; merge is gated open.
   - **Requests revision** — files specific changes the developer must make. Merge stays
     gated closed.

## Why distinct from the developer and test-author

The quality-officer is the adversarial reader — independent of the realization-writing and
test-writing labor. Their reading catches:

- Type errors mypy surfaces but the developer didn't run before commit.
- Style violations.
- Subtle semantic regressions that pass tests but break the realization claim.
- Missing duty-discharge (no `@realizes` decoration; no docstring corpus citation; bool
  return for a structural claim).

## Boundary with the records-officer

The quality-officer reviews source code and tests; the records-officer reviews governance
records. If a code change implies a governance change (e.g., a new public API surface
warranting a stability-tier mark), the quality-officer files an ADR-request triage note for
the records-officer.

## Powers attached

- [`run-type-check`](../powers/run-type-check.md) — invoke `mypy --strict`.
- [`run-lint`](../powers/run-lint.md) — invoke `ruff`.
- [`review-change`](../powers/review-change.md) — read a diff and produce a review verdict.
- [`request-revision`](../powers/request-revision.md) — formally request the developer
  revise (gates merge closed until satisfied).

## Incumbency

Currently held informally. Inference sessions tasked with code review; agent record
at [`pypredcalc-quality-officer-agent`](../agents/pypredcalc-quality-officer-agent.md).
The mypy and ruff invocations are unix-tool agents:
[`pypredcalc-mypy-tool`](../agents/pypredcalc-mypy-tool.md) and
[`pypredcalc-ruff-tool`](../agents/pypredcalc-ruff-tool.md).

Formal incumbency record: [`emsenn-incumbency`](../personnel/emsenn-incumbency.md) — captain holds this office informally pending substrate-driven dispatch.
