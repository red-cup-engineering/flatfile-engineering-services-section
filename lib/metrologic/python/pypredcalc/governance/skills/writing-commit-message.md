---
name: "Writing commit message"
description: "Composes a commit message conformant to commit-message-format spec — domain-prefixed subject under 72 chars, body with Closes/Advances slug references, optional trailers. Use whenever drafting a commit message in this repo."
---

# Writing commit message

The procedure for drafting a commit message that conforms to
[`commit-message-format`](../specifications/commit-message-format.md)
and discharges
[`commit-references-task-slug`](../duties/commit-references-task-slug.md).

## When to use

- Whenever invoking [`commit-changes`](../powers/commit-changes.md).
- Composed automatically by
  [`committing-work-cycle`](committing-work-cycle/SKILL.md) and
  [`cutting-release`](cutting-release.md).

## Inputs

- The closing/advancing task slug(s) — typically the head of the
  work cycle just completed.
- The diff being committed, for picking the domain prefix.
- Any non-obvious decisions or pointers to briefs / specs / decisions.

## Steps

1. **Pick the domain prefix.** Read the diff's file paths.
   - Single subpackage under `src/pypredcalc/` → name the
     subpackage (`algebra`, `predication`, `sheaf`, …).
   - Single substrate area outside src → name the area (`governance`,
     `work`, `prose`, `tests`, `build`).
   - Multi-domain change → join up to two prefixes with `+`. If
     three or more would be needed, the commit should split.

2. **Draft the subject line.**

   ```
   <domain>: <imperative summary>
   ```

   - Imperative mood (`add`, `realize`, `fix`, `update`, `remove`),
     not past tense.
   - 72-character hard cap. Count.
   - No trailing period.

3. **Draft the body.** First paragraph names the closed/advanced
   tasks:

   ```
   Closes <task-slug>: <one-line summary of what the closure
       achieved at the realization or governance level>.
   Advances <task-slug>: <one-line summary of partial progress>.
   ```

   Each line stands alone; line-wrap is a soft cap, not enforced.

4. **Add the why.** A short paragraph (one to four sentences)
   describing the *why* of the change — the constraint the change
   satisfies, the corpus claim it realizes, the governance gap it
   fills, the test failure it addresses. Skip if the
   `Closes <slug>: <summary>` line already conveys it.

5. **Cite supporting records (optional).** If the change leans on a
   brief, decision, specification, or open question, cite it
   inline:

   ```
   See work/briefs/<slug>.md for the per-cell derivation and the
   inexpressivity worked example.
   ```

6. **Add trailers (optional).** Trailers go in their own block at
   the end:

   - `Co-Authored-By: <Name> <email>` for collaborative commits.
   - `Refs: <slug>` for tangentially-related references that are
     neither closed nor advanced.

7. **Verify the cap.** Subject ≤ 72 chars. At least one
   `Closes <slug>:` or `Advances <slug>:` line for any commit that
   touches `work/` or `src/`. (For commits that touch neither —
   pure typo fixes, doc-only fixes — `Why:` paragraph suffices.)

## Outcomes

A commit message conformant to the format spec. Subject line
domain-prefixed and within the cap; body names every closed and
advanced task slug; trailers (where present) follow the conventional
form.

## Failure modes

- **Subject overflows the cap.** Tighten the imperative summary
  before considering a domain change. If that fails, the commit
  likely should split.
- **No closing slug, but the diff touches `work/` or `src/`.** The
  developer / records-officer is committing without having closed a
  task. Either close the task (and reference the slug) or file the
  commit as an unbound `Why:`-only commit (an exception, not the
  default).
- **Slug references resolve to nonexistent records.** Either the
  slug is a typo or the task record was never created. Fix the slug
  or create the record before committing.
