---
title: "Enforce mypy --strict"
type: jural-relation
kind: duty
slug: enforce-mypy-strict
active-holder: pypredcalc-quality-officer
passive-party: pypredcalc-community
scope-action: gate-merge-on-mypy-result
triggering-powers: [run-type-check, review-change]
required-action: gate-merge-closed-when-mypy-dirty
enforcement: substrate-violation
rule-type: N→O
theory-basis: [jural-relation, normative-operational-layering]
---

# Enforce mypy --strict

The quality officer MUST gate merge closed when `mypy --strict src/pypredcalc` reports any
error. Type-clean code is a substrate baseline; type errors mean the realization may have
unsoundnesses that aren't surfaced by tests.

## Required action

When the quality-officer runs [`run-type-check`](../powers/run-type-check.md):

1. Capture mypy's report.
2. If clean: pass through; merge gate stays open with respect to types.
3. If dirty: file a [`request-revision`](../powers/request-revision.md) listing the type
   errors with file:line references; merge gate closes until the developer remediates.

## What this does NOT cover

- Type errors in `tests/`. Test code is exempted from `--strict` per the project's mypy
  configuration; a runtime test failure is the test code's correctness check, not type
  signature.
- Type ignores (`# type: ignore`). They're permitted with a comment explaining *why* the
  ignore is necessary. Unannotated ignores are themselves substrate violations the
  quality-officer should flag.

## Enforcement

CI runs `mypy --strict` on every commit; the gate is wired into the release pipeline.
Without CI (e.g., during local development), the quality-officer's manual run on
review-change exercise is the gate.
