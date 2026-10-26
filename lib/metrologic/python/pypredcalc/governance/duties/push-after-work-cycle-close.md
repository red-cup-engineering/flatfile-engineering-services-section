---
title: "Push after work-cycle close"
type: jural-relation
kind: duty
slug: push-after-work-cycle-close
active-holder: [pypredcalc-release-officer, pypredcalc-executive-officer]
passive-party: pypredcalc-community
scope-action: publish-commits-to-origin
triggering-powers:
  - push-to-remote
required-action: push-to-origin-after-loop-closure
enforcement: substrate-violation
rule-type: N→O
theory-basis: [jural-relation, normative-operational-layering, dispatch-readiness]
---

# Push after work-cycle close

A work cycle closes properly only when its commit-witness has been
pushed to `origin`. Pushes are part of the standard work-cycle
sequence — commit, then push — not an optional extra and not a
captain-authorized act.

## Why this duty exists

The substrate's source-of-truth chain is read by downstream
consumers (the parent `561` repo's submodule machinery, other
inference sessions, audit tools running off the remote). A commit
that lands locally but never publishes leaves those consumers
reading stale state — the commit-witness exists but is invisible.
Pushing is the publication step that makes the commit-witness do
its job.

Pushing is *routine*: an office holder closing a work cycle pushes
without seeking permission, exactly like committing without seeking
permission. The captain reactively intervenes if a particular push
should not have happened; the captain does not pre-authorize each
one. Treating push as captain-gated would inject bureaucratic
friction the captain has explicitly named as wrong.

## Required action

After [`committing-work-cycle`](../skills/committing-work-cycle/SKILL.md)
lands a commit that closes a task:

1. Run [`pushing-to-remote`](../skills/pushing-to-remote.md) — the
   pre-push checks (status, ahead/behind, fetch) plus the
   `git push` itself.
2. Verify the push landed (origin matches local HEAD).
3. The work cycle is then closed end-to-end.

For multi-commit work cycles (a task whose closure spans more than
one commit), push after the last commit, not after each individual
commit. Batching is fine; deferring publication past the work-cycle
close is not.

## What this duty rules out

- Sitting on local commits indefinitely. If the work cycle is
  closed, the push should follow.
- "I'll push later when convenient." The work cycle is not closed
  until the push lands.
- Asking the captain "should I push?" at the end of every cycle.
  Push.

## What this duty does NOT cover

- **Force-pushes** (`--force`, `--force-with-lease`) — these rewrite
  remote history and DO require explicit captain authorization for
  the rewrite, separate from the routine push covered here. A force
  push is not the same act as a push.
- **Pushing branches the captain has explicitly told you not to
  push** — e.g., a feature branch the captain is reviewing offline.
  Captain's standing instruction to *not* push something is
  authoritative; absent such instruction, push.
- **Pushing past a red gate** — if pre-commit gates failed and the
  commit nevertheless landed (e.g., `--no-verify`), pushing that
  commit is itself a duty violation. Push only commits that landed
  cleanly.

## Composes with

- [`commit-only-after-acceptance-met`](commit-only-after-acceptance-met.md) —
  the commit-side gate; this duty is the publication-side
  follow-through.
- [`close-execution-loops`](close-execution-loops.md) — the XO's
  loop-closing duty cites the push as the final witness binding the
  loop closed end-to-end.
