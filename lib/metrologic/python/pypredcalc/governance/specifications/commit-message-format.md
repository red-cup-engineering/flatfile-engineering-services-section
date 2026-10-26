---
title: "Commit message format"
type: specification
status: active
slug: commit-message-format
version: "0.1"
theory-basis:
  - jural-relation
  - witness-every-classification
  - dispatch-readiness
---

# Commit message format

The shape every commit message landing in this repository must take, so
that `pyfars audit-commits` can bind a commit to the work-record
witness(es) it closes.

## Why this exists

Commits are *witnesses to acts*: the act of completing a task, the act
of cutting a release, the act of revising a governance record. A
commit message that does not name the act loses the binding between
the workspace's source-of-truth chain and the git history. The
parent-repo's `pyfars audit-commits` reads commit messages to settle
which tasks have a closure-witness; this specification is the format
that audit reads.

## The spec

### Subject line (first line)

```
<domain>: <imperative one-line summary>
```

- `<domain>` is a lower-kebab-case label naming the affected area —
  typically a subpackage (`algebra`, `predication`, `sheaf`,
  `topology`, `combinatorics`, `lattice`, `dynamics`), a substrate
  area (`governance`, `work`, `prose`, `tests`), or a build artifact
  (`build`, `flake`, `ci`).
- `<imperative one-line summary>` describes the change in present-
  tense imperative (`add`, `realize`, `fix`, `update`, `remove`).
  Hard cap: 72 characters total subject-line length.
- No trailing period.

Examples:

- `sheaf: realize q-enriched sheaf tensor and internal hom`
- `governance: add commit-changes power and committing-work-cycle skill`
- `predication: drain remaining strict mypy debt to zero`

Multi-domain commits use one domain prefix joined by `+`:
`sheaf+work: …`. Two domains is the maximum; if a commit spans more,
that is itself a signal the commit should split.

### Body (after a blank line)

The body MUST contain at least one task-slug reference for every
work-record this commit closes or advances. Two reference forms:

- `Closes <task-slug>: <one-line summary>` — the commit closes the
  named task (status moves to terminal in the same change set).
- `Advances <task-slug>: <one-line summary>` — the commit advances
  but does not close the named task (e.g., partial work,
  intermediate step).

Both forms accept multiple lines if more than one task is involved.
The body's free-form prose follows: the *why* of the change, any
non-obvious decisions, pointers to briefs / decisions / specs the
change leans on.

For commits that do *not* close a task (e.g., a captain-driven
content edit, a typo fix), the body need not name a slug, but a
short `Why:` paragraph is required. `pyfars audit-commits` will
report these as *unbound commits*; the captain accepts unbound
commits by exception.

### Trailers

The final block may carry trailers (each on its own line):

- `Co-Authored-By: …` for collaboratively-authored commits.
- `Refs: <work-record-slug>` for tangentially-related references
  beyond the closed/advanced tasks.

## What's bound

- Subject domain prefix is mandatory.
- For task-closing commits, at least one `Closes` or `Advances`
  trailer-style line in the body is mandatory.
- Hard cap on subject-line length (72 characters).
- Imperative-mood subject summaries.

## What's not bound

- The body's prose structure beyond the slug-reference requirement.
  Authors may use bullet lists, prose paragraphs, headed sections —
  whatever serves the change.
- The choice of which domain prefix to use when a commit reasonably
  fits multiple — author judgment, with `+`-joined domains as the
  fallback.
- Word-wrap width of the body (no hard cap; soft cap ~76 cols
  recommended for readable `git log`).

## Audit

`pyfars audit-commits` reads commit messages from the repo head
backwards. For each commit, it:

1. Extracts the subject domain prefix.
2. Scans the body for `Closes <slug>:` and `Advances <slug>:` lines.
3. Resolves each slug against `work/tasks/`, `work/goals/`,
   `work/questions/`, `work/inbox/`, `work/audits/`.
4. For each resolved task, verifies the task's `status:` cell is in
   a terminal state (`done`, `partial`, `stalled`, `abandoned`) when
   the commit form is `Closes`, or any state when `Advances`.
5. Reports drift: commits referencing nonexistent slugs; closed
   tasks without a closing commit; commits whose `Closes` slug
   resolves to a non-terminal-status task.

## Boundary with other repositories

The parent `561` repository may carry its own commit-message format;
this specification governs *only* commits whose changeset touches
the `tools/math/pypredcalc/` subtree. Cross-repo commits (which the
parent's submodule machinery may encode) follow the parent's
format; this spec applies to single-subtree commits made from
within this directory.
