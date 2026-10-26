---
title: "Create work record"
type: jural-relation
kind: power
slug: create-work-record
active-holder: pypredcalc-records-officer
passive-party: pypredcalc-community
scope-action: create-work-file
scope: work/
correlate-of: liability
duties: [consult-corpus-before-encoding]
enables-skills: [writing-task-records]
theory-basis: [jural-relation, normative-operational-layering, task-cell-system]
---

# Create work record

Admits the records-officer to create a new file under `work/` — a goal, a task, a question,
a backlog entry, an inbox item, an audit report.

## Attached duty

- [`consult-corpus-before-encoding`](../duties/consult-corpus-before-encoding.md) — verify
  the schema and check the corpus for relevant grounding before writing.

## Scope

`pypredcalc/work/` and any subdirectory.

## Hierarchy invariant

Per the work-record hierarchy, parent records exist before child records:

```
goal → task
```

A task record that references a goal that doesn't exist is an ordering violation. If tasks
are created first (as can happen when porting from a roadmap), the goal record must be
created before the task is dispatched.
