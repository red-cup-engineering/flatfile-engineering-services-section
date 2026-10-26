---
name: "Writing CHANGELOG narrative"
description: "Authors the leap-narrative paragraph at the top of a CHANGELOG release entry, plus the subpackage-by-subpackage detail. Use as part of cutting a release."
---

# Writing CHANGELOG narrative

## Requirements

- Release-officer office.
- The set of changes the release includes (from `git log` since the prior release tag).

## Steps

1. Read the diff against the prior release. Group changes by subpackage and by category
   (additive Stable, breaking Stable, Provisional churn, bugfix).
2. Write the leap-narrative paragraph: 1–3 paragraphs in math-reader terms explaining
   *what the release adds*. Aim for: a math researcher reads this and gets the leap
   without reading the per-subpackage detail.
3. Write the subpackage detail: one section per subpackage, listing what shipped, what
   was deprecated, what was promoted from Provisional to Stable.
4. Add the corpus-realization summary: number of new `@realizes`-bound entities; new
   corpus theorems realized.
5. If breaking changes happened (Stable removals or signature changes via deprecation
   removal), call them out at the top of the entry separately so downstream consumers
   see them on first read.

## Format

```markdown
## X.Y.Z — Title in math-reader terms

### The leap

<one to three paragraph leap-narrative>

### Subpackage X

- ...
- ...

### Subpackage Y

...

### Numbers

- Tests: N pass (was M).
- Realizations: K @realizes-bound entities (was K-Δ).
- New corpus realizations: <list>.
```

## Outcomes

A CHANGELOG entry that a math reader can follow. Mechanical changelogs without the
narrative are duty-non-fulfillment per
[`write-changelog-narrative`](../duties/write-changelog-narrative.md).
