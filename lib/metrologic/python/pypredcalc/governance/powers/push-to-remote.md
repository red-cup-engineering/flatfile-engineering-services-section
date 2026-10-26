---
title: "Push to remote"
type: jural-relation
kind: power
slug: push-to-remote
active-holder: [pypredcalc-release-officer, pypredcalc-executive-officer]
passive-party: pypredcalc-community
scope-action: publish-commits-to-origin
correlate-of: liability
duties:
  - push-after-work-cycle-close
enables-skills:
  - pushing-to-remote
theory-basis: [jural-relation, normative-operational-layering, witness-every-classification]
---

# Push to remote

Publishing local commits to the configured `origin` remote. Distinct
from [`commit-changes`](commit-changes.md): commits are local
witnesses; pushes are public claims that downstream consumers (the
parent `561` repo, CI, anyone tracking the remote) immediately see.

## Effect

`git push origin <branch>` publishes the local branch's commits.
After a successful push, the named branch on the remote points at
the local branch's HEAD.

Force-pushes (`--force`, `--force-with-lease`) are a *separate act*
because they rewrite remote history; they require explicit captain
authorization for the rewrite. The ordinary push covered by this
power is not so constrained.

## Holders

- **Release officer** — pushes a tagged release after
  [`cutting-release`](../skills/cutting-release.md) completes
  (composing the release pipeline through publication).
- **Executive officer** — pushes routine work-cycle commits at the
  end of every closed work cycle.

The power is held by both because the *act* of pushing is the same;
what differs is the work-cycle context (release pipeline vs. routine
loop-closure).

## Attached duties

- [`push-after-work-cycle-close`](../duties/push-after-work-cycle-close.md) —
  pushes are part of the standard work-cycle sequence: commit, then
  push. Routine, not captain-gated.

## Boundary with `cutting-release`

`cutting-release` composes both `commit-changes` and `push-to-remote`
within a single release ceremony. The release officer's holding of
both powers is what makes that composition possible. The XO holds
`push-to-remote` separately so that day-to-day work-cycle pushes
land without invoking the full release ceremony.
