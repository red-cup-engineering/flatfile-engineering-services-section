---
title: "Commit changes"
type: jural-relation
kind: power
slug: commit-changes
active-holder: [pypredcalc-developer, pypredcalc-records-officer, pypredcalc-release-officer]
passive-party: pypredcalc-community
scope-action: write-git-commit
correlate-of: liability
duties:
  - commit-references-task-slug
  - commit-only-after-acceptance-met
enables-skills:
  - committing-work-cycle
  - writing-commit-message
theory-basis: [jural-relation, normative-operational-layering, witness-every-classification]
---

# Commit changes

Multiple offices may write a git commit, each within its own scope:

- **Developer** — commits realization output (source + tests + briefs)
  at the close of a realization-task work cycle.
- **Records officer** — commits governance-record changes (decisions,
  specifications, office records, duty / power records).
- **Release officer** — commits release-shape changes (version bump,
  CHANGELOG entry, build-config edit) as part of a release ceremony.

The power itself is shared; the skills exercising it differ per
office. The act is the same — `git commit` — but the duties on each
holder shape *what* gets committed and *when*.

## Effect

A new commit lands in the local branch. Per
[`commit-references-task-slug`](../duties/commit-references-task-slug.md),
the commit message references at least one task slug for any commit
that closes or advances substrate work. The commit becomes a witness
that `pyfars audit-commits` binds back to the named task records per
[`commit-message-format`](../specifications/commit-message-format.md).

## Attached duties

- [`commit-references-task-slug`](../duties/commit-references-task-slug.md) —
  the commit message references the closed/advanced task slug(s).
- [`commit-only-after-acceptance-met`](../duties/commit-only-after-acceptance-met.md) —
  the commit lands only when the closing task's acceptance criteria
  are all met (or are explicitly closed under `partial` /
  `stalled`).

## Boundary with `push-to-remote`

A commit is local; a push publishes. The two are distinct powers
because publishing changes others' state (rebase risk, downstream
consumers see the change) while committing does not. See
[`push-to-remote`](push-to-remote.md).

## Boundary with `cutting-release`

The release officer's [`cutting-release`](../skills/cutting-release.md)
skill composes commit-changes within a release ceremony — the same
power, exercised under a different duty profile (release-shape
message, version-bump content, follow-up tag). Day-to-day developer
commits use [`committing-work-cycle`](../skills/committing-work-cycle/SKILL.md);
release commits use the release skill.
