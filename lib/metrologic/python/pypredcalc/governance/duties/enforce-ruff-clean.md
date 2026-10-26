---
title: "Enforce ruff clean"
type: jural-relation
kind: duty
slug: enforce-ruff-clean
active-holder: pypredcalc-quality-officer
passive-party: pypredcalc-community
scope-action: gate-merge-on-ruff-result
triggering-powers: [run-lint, review-change]
required-action: gate-merge-closed-when-ruff-dirty
enforcement: substrate-violation
rule-type: N→O
theory-basis: [jural-relation, normative-operational-layering]
---

# Enforce ruff clean

The quality officer MUST gate merge closed when `ruff check` reports any violation under
the rule set declared in `pyproject.toml`.

## Required action

When [`run-lint`](../powers/run-lint.md) runs:

1. Capture ruff's report.
2. If clean: pass through.
3. If dirty: file a [`request-revision`](../powers/request-revision.md) with the
   violations; merge gate closes.

## Rule-set evolution

The ruff rule set in `pyproject.toml` is governed by a decision (an ADR). Loosening the
rule set requires an ADR. Tightening (adding rules) is a release-officer decision in
coordination with the records-officer; existing code may need fixes before the rule set
tightens.

## Enforcement

CI runs `ruff check src/ tests/` on every commit. Failures block merge.
