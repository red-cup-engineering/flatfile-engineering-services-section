---
name: "Committing work cycle"
description: "Lands the output of a closed work cycle as a git commit — verifies acceptance, drafts a slug-referencing message, stages specific paths, runs git commit. Use at the end of every realization or governance work cycle whose output is a code or record change."
---

# Committing work cycle

The end-of-cycle git commit. Composes acceptance verification,
[`writing-commit-message`](../writing-commit-message.md), and the
actual `git commit` invocation into one operation that discharges
both [`commit-references-task-slug`](../../duties/commit-references-task-slug.md)
and [`commit-only-after-acceptance-met`](../../duties/commit-only-after-acceptance-met.md).

## Canonical realization

The substrate-native helper is the
[`commit.py`](commit.py) script alongside this SKILL.md. It reads
the named task records, verifies their acceptance state, and emits
a draft commit message conformant to
[`commit-message-format`](../../specifications/commit-message-format.md).
Invoke it via:

```
python governance/skills/committing-work-cycle/commit.py <task-slug> [<task-slug> ...]
```

The script's output is a draft commit message printed to stdout. The
office holder edits it and runs `git commit -m "$(...)" -- <paths>`
themselves; the script does not invoke git directly (so that path
selection remains an explicit office-holder act, not a hidden
default).

The markdown procedure below is the manual path when the helper is
unavailable; the two should produce equivalent commits on equivalent
input.

## When to use

- At the end of a work cycle whose closing-task is in a terminal
  state (`done`, `partial`, `stalled`).
- Before running [`closing-execution-loop`](../closing-execution-loop.md) —
  the loop-close cites the commit witness, so the commit must
  precede the loop-close.
- Composed by [`cutting-release`](../cutting-release.md) for the
  release-shape commit.

## Requirements

- Holder of [`commit-changes`](../../powers/commit-changes.md) —
  developer, records-officer, or release-officer.
- A closing-task with verified acceptance state (per
  [`commit-only-after-acceptance-met`](../../duties/commit-only-after-acceptance-met.md)).
- The diff to be committed corresponds to the closing-task's
  realization (no unrelated changes mixed in).

## Steps

1. **Verify acceptance.** Read the closing-task's "Acceptance"
   section. For each bullet:
   - Confirm `[x]` is set.
   - Confirm the underlying claim is true (test passes, audit
     clean, record exists).
   - For unchecked bullets: either resolve them now or close the
     task as `partial` with a follow-up.

2. **Run the gates.** Pre-commit gates the office holder's duty
   profile requires:
   - Developer: full pytest suite (per
     [`running-test-suite`](../running-test-suite.md)).
   - Records-officer: governance-record format conformance (no
     specific tooling; visual review).
   - Release-officer: composes additional gates per
     [`cutting-release`](../cutting-release.md).

3. **Draft the commit message.** Run
   [`writing-commit-message`](../writing-commit-message.md). The
   helper script `commit.py` produces the draft from the task
   records.

4. **Identify the paths to commit.** List explicitly the file paths
   the closing-task's realization touches:
   - `src/pypredcalc/<subpackage>/<file>.py` for source.
   - `tests/test_<topic>.py` for tests.
   - `work/briefs/<slug>.md` for new briefs.
   - `work/tasks/...` for status-cell updates.
   - `work/goals/...` for goal-cell updates.
   - Governance record paths if the change is governance-side.

   Do NOT use `git add -A` or `git add .` — the convention is
   explicit paths. See the parent CLAUDE.md guidance.

5. **Stage and commit.** For untracked files, `git add <paths>`
   first; for tracked files, the `-- <paths>` form on `git commit`
   is sufficient. Commit:

   ```
   git commit -m "$(cat <<'EOF'
   <subject>

   Closes <task-slug>: <summary>.
   ...
   EOF
   )" -- <paths>
   ```

6. **Verify the commit landed.** `git log -1 --stat` shows the new
   commit's subject and changed files. Confirm:
   - Subject matches the draft.
   - Body contains the slug references.
   - File list matches the explicit paths (no surprises from a
     pre-staged index).

7. **Hand off to closure.** The XO's
   [`closing-execution-loop`](../closing-execution-loop.md) cites
   the new commit's hash as the closure witness for the task.

## Outcomes

A new commit on the local branch, conformant to
[`commit-message-format`](../../specifications/commit-message-format.md).
The closing-task's `status:` cell is in a terminal state and the
git history carries the witness binding.

## Failure modes

- **Acceptance bullets unchecked.** Step 1 fails; either resolve or
  re-classify the closure category.
- **Pre-commit gate fails (e.g., red tests).** Do not commit. Fix
  the test failure first; that fix becomes its own commit (or part
  of this one), but the commit cannot land with the gate red — per
  [`commit-only-after-acceptance-met`](../../duties/commit-only-after-acceptance-met.md).
- **Pre-staged index includes unrelated changes.** The `-- <paths>`
  form on `git commit` excludes those from this commit; they remain
  staged for the captain or next office holder. Do NOT include them
  silently.
- **Commit hook rejects the commit.** Read the hook's report; fix
  the underlying issue. Per the parent CLAUDE.md, do not bypass
  hooks (`--no-verify`) without explicit captain instruction.
