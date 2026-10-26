---
title: "Commit references task slug"
type: jural-relation
kind: duty
slug: commit-references-task-slug
active-holder: [pypredcalc-developer, pypredcalc-records-officer, pypredcalc-release-officer, pypredcalc-executive-officer]
passive-party: pypredcalc-community
scope-action: write-git-commit
triggering-powers:
  - commit-changes
required-action: name-closed-or-advanced-task-slug-in-commit-body
enforcement: substrate-violation
rule-type: N→O
theory-basis: [jural-relation, witness-every-classification, dispatch-readiness, task-cell-system]
---

# Commit references task slug

Every commit landing on this repository's history that closes or
advances substrate work MUST name the task slug(s) it closes or
advances in the commit body, per
[`commit-message-format`](../specifications/commit-message-format.md).

## Why this duty exists

A commit is a witness — the act-record for completing or advancing a
task. Without a slug reference, the binding from work-record to
commit is lost: `pyfars audit-commits` cannot resolve "did this task
get a closure-witness?" against the git history, and the dispatch
loop reads stale state. The duty makes the binding load-bearing.

## Required action

For each commit that closes or advances at least one task:

1. The commit body contains one line per closed task in the form
   `Closes <task-slug>: <one-line summary>`.
2. The commit body contains one line per advanced-but-not-closed
   task in the form `Advances <task-slug>: <one-line summary>`.
3. Each named slug resolves to an existing record under `work/`.

For commits that do not close or advance any task (typo fixes,
reformatting, captain-driven content edits), the duty does not
require a slug reference but does require a `Why:` paragraph in
the body — see the unbound-commit branch in the format spec.

## Enforcement

Pre-substrate-automation: `pyfars audit-commits` is the audit; drift
shows up as unbound commits or dangling slug references.

Post-substrate-automation: a pre-commit hook would refuse a commit
whose body fails the slug-reference check. The hook is an
anticipated mechanism, not a current one — the duty currently lives
on the office holders' discipline, validated by the audit.

## Composes with

- [`witness-every-classification`](witness-every-classification.md) —
  closure of a task is a classification; the commit is its witness.
- [`close-execution-loops`](close-execution-loops.md) — the XO's
  loop-closing duty is satisfied (in part) by the commit-witness
  this duty produces.
