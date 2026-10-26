---
title: "Request revision"
type: jural-relation
kind: power
slug: request-revision
active-holder: pypredcalc-quality-officer
passive-party: pypredcalc-developer
scope-action: file-revision-request
correlate-of: liability
theory-basis: [jural-relation, normative-operational-layering]
---

# Request revision

The quality officer may file a formal revision request on a change. The request names
specific issues the developer must address before the merge gate opens.

## Effect

A revision-request record at `work/inbox/<slug>-revision-<n>.md` with frontmatter:

- `type: revision-request`
- `for-change: <commit-or-branch>`
- `reviewer: pypredcalc-quality-officer`
- `status: open`

Body lists each issue with file:line references and the required fix. The developer
exercises [`write-pypredcalc-source`](write-pypredcalc-source.md) to address each issue,
and the quality-officer re-reviews via [`review-change`](review-change.md) until either
all issues are resolved (status `addressed`) or the change is withdrawn.

## Liability

The developer holds the correlate liability: the request creates a duty-equivalent on
the developer to address the issues before merge. The developer's
[`immunity-from-spec-violating-duty`](immunity-from-spec-violating-duty.md) protects
against revision requests that themselves require corpus violations — those get filed as
escalation triage notes for the steward.
