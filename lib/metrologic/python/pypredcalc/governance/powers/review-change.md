---
title: "Review change"
type: jural-relation
kind: power
slug: review-change
active-holder: pypredcalc-quality-officer
passive-party: pypredcalc-community
scope-action: read-diff-and-produce-review-verdict
correlate-of: liability
duties: [review-before-merge]
enables-skills: [doing-code-review]
theory-basis: [jural-relation, normative-operational-layering, formality-layer]
---

# Review change

The quality officer may read a diff (a commit, a branch, an in-flight work product) and
produce a review verdict. The review checks:

- Type discipline (mypy clean).
- Lint discipline (ruff clean).
- Realization-claim correctness — does the code preserve the corpus atom's structure?
- Witness-pattern correctness for structural claims.
- Test coverage — every new public name has tests.
- Convention adherence (frozen dataclasses, Fraction arithmetic, `@realizes` decorations).

## Verdict

Either:

- **Approve** — the change passes; merge is gated open via the absence of revision requests.
- **Request revision** — files specific changes the developer must make
  (per [`request-revision`](request-revision.md)). Merge stays gated closed.

## Attached duty

- [`review-before-merge`](../duties/review-before-merge.md) — every merge-eligible change
  is reviewed before the merge gate opens.
