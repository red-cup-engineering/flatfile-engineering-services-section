---
title: "Review before merge"
type: jural-relation
kind: duty
slug: review-before-merge
active-holder: pypredcalc-quality-officer
passive-party: pypredcalc-community
scope-action: complete-review-before-merge
triggering-powers: [review-change]
required-action: produce-review-verdict-before-merge-gate-opens
enforcement: substrate-violation
rule-type: N→N
theory-basis: [jural-relation, normative-operational-layering]
---

# Review before merge

Every change destined for the main branch (including releases) MUST receive a quality-
officer review verdict — approve or request-revision — before the merge gate opens. No
silent merges; no "the developer reviewed their own work."

## Required action

For every merge-eligible change:

1. Run [`run-type-check`](../powers/run-type-check.md) and
   [`run-lint`](../powers/run-lint.md). Both must be clean.
2. Run [`run-test-suite`](../powers/run-test-suite.md). Must be green.
3. Read the diff. Verify:
   - `@realizes` decorations present on all realizing entities (per
     [`decorate-every-realization`](decorate-every-realization.md)).
   - Witness pattern preserved for structural claims (per
     [`return-witness-for-structural-claims`](return-witness-for-structural-claims.md)).
   - Frozen dataclasses for value-bearing classes.
   - Tests exist for new public surface.
   - CHANGELOG entry exists if release-eligible.
4. File a verdict: approve or [`request-revision`](../powers/request-revision.md).
5. Until the developer addresses any revision requests, merge stays gated closed.

## Why this duty exists

Without the merge gate, the developer's `write-pypredcalc-source` power has no adversarial
check. The realization claim, the test coverage, the witness pattern — all rely on a
second reader. The quality-officer is that second reader.

## Self-review exemption

When the change is sufficiently small and the developer is also acting as quality-officer
in the same session (informal incumbency), the developer can self-review. Any change
larger than a small bugfix or one-realization scope warrants a separate quality-officer
session.
