---
name: "Gating merge"
description: "Composes the type-check, lint, test, audit, and review gates into a single merge-eligibility verdict. Use as the final pre-merge check."
---

# Gating merge

## Requirements

- Quality-officer office.
- All component gates (mypy, ruff, tests, audit, review) ready to run.

## Steps

1. Run [`running-mypy-strict`](running-mypy-strict.md). Must be clean.
2. Run [`running-ruff`](running-ruff.md). Must be clean.
3. Run [`running-test-suite`](running-test-suite.md). Must be green.
4. Run [`running-corpus-binding-audit`](running-corpus-binding-audit.md). No unresolved
   `@realizes` slugs.
5. Run [`doing-code-review`](doing-code-review.md). Must produce approve verdict.
6. If all five gates pass, file the merge-eligibility verdict: `merge-gate: open`.
7. If any gate fails, the verdict is `merge-gate: closed` with the failing-gate reason
   recorded.

## Outcomes

A merge-eligibility verdict for one specific change. Open verdicts unblock the change for
release inclusion; closed verdicts return to the developer for remediation.
