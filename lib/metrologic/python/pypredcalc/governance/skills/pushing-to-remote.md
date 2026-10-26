---
name: "Pushing to remote"
description: "Publishes local commits to origin at the end of a work cycle. Runs pre-push checks (status, ahead/behind, fetch) and git push. Use after committing-work-cycle lands a closure commit."
---

# Pushing to remote

The publication step. Composes pre-push state checks with
`git push origin <branch>`. Runs as a routine part of every
work-cycle close, not gated on per-push captain authorization.

## When to use

- After [`committing-work-cycle`](committing-work-cycle/SKILL.md)
  lands a closure commit. This is the standard sequence: close
  the loop, commit, push.
- As the final step of [`cutting-release`](cutting-release.md).
- NOT for force-pushes. Force-pushing rewrites remote history and
  is a separate act requiring explicit captain authorization for
  the rewrite.

## Requirements

- Holder of [`push-to-remote`](../powers/push-to-remote.md) — the
  release-officer or executive-officer.
- A landed commit (or commits) that closed the work cycle whose
  push this is.

## Steps

1. **Check the local state.**
   - `git status` — note any uncommitted changes. They will not
     publish; surface them to the office holder so they're not
     forgotten.
   - `git log origin/<branch>..HEAD --oneline` — the list of
     commits about to publish.
   - `git fetch origin` — pull in remote refs without merging, so
     the next step's check is current.
   - `git log HEAD..origin/<branch> --oneline` — the list of
     commits the remote has that we don't. If non-empty, the local
     branch is behind; rebase or merge before pushing.

2. **Run `git push origin <branch>`.**

   ```
   git push origin main
   ```

   Use the explicit branch name even when the upstream is set; this
   makes the push log unambiguous.

3. **Verify the push landed.**
   - `git log origin/<branch> -1 --oneline` matches local HEAD.
   - For releases: confirm the tag pushed too (`git push --tags`
     or `git push origin <tag>` — the release skill specifies
     which).

4. **Witness the push.** The push event is itself a classification
   per [`witness-every-classification`](../duties/witness-every-classification.md).
   Currently the witness is the response in session plus the git
   reflog entry; post-substrate-automation, an explicit witness
   record is produced in `work/audits/`.

## Outcomes

The remote `<branch>` ref points at local HEAD. Downstream consumers
(parent `561` repo's submodule, CI, anyone tracking origin) can read
the published commits. The work cycle is closed end-to-end.

## Failure modes

- **Local branch is behind origin.** Do not force-push. Rebase or
  merge to bring local up to date with origin, re-run the work-cycle
  gates (the rebase may have changed working semantics), then push.
- **Push rejected by remote (non-fast-forward).** Same as the
  preceding case. Investigate the divergence; do not bypass with
  `--force` or `--force-with-lease` without an explicit captain
  note authorizing the rewrite.
- **Pre-push hook fails.** Read the hook's report; fix the
  underlying issue. Per the parent CLAUDE.md, do not bypass hooks
  (`--no-verify`) without explicit captain instruction.
- **Captain has issued a standing "do not push" instruction for the
  branch.** Honor it. Captain's standing instruction to *not* push
  is authoritative; absent such instruction, push.

## Boundary with `cutting-release`

`cutting-release` composes this skill within the release pipeline as
its publication step.

## Boundary with `committing-work-cycle`

The two skills compose in sequence: the work cycle commits locally
([`committing-work-cycle`](committing-work-cycle/SKILL.md)), then
the push publishes ([`pushing-to-remote`](pushing-to-remote.md)).
Both are routine parts of the work cycle's close. Per
[`push-after-work-cycle-close`](../duties/push-after-work-cycle-close.md),
a work cycle is not closed until the push lands.
