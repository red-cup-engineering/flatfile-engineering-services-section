---
title: "Modify work record"
type: jural-relation
kind: power
slug: modify-work-record
active-holder: pypredcalc-records-officer
passive-party: pypredcalc-community
scope-action: edit-existing-work-file
scope: work/
correlate-of: liability
duties: [consult-corpus-before-encoding]
theory-basis: [jural-relation, normative-operational-layering]
---

# Modify work record

Admits the records-officer to edit an existing file under `work/` — status transitions on
goals/tasks, frontmatter updates, body amendments.

## Status-transition responsibility

Status transitions (`open → dispatched → in-progress → done`) are also written by the XO
during dispatch and closure (via [`dispatch-task-to-office`](dispatch-task-to-office.md) and
[`close-execution-loop`](close-execution-loop.md)). Both the records-officer and the XO may
modify task status fields; the XO does so as part of dispatch lifecycle, the records-officer
does so for corrective amendments.

## Attached duty

- [`consult-corpus-before-encoding`](../duties/consult-corpus-before-encoding.md) — applies
  to substantive modifications, not to routine status transitions during dispatch lifecycle.
