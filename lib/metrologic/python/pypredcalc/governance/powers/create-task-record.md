---
title: "Create task record"
type: jural-relation
kind: power
slug: create-task-record
active-holder: [pypredcalc-records-officer, pypredcalc-developer, pypredcalc-corpus-tracker]
passive-party: pypredcalc-community
scope-action: create-task-record-file
scope: work/tasks/
correlate-of: liability
duties: [consult-corpus-before-encoding]
enables-skills: [writing-task-records]
theory-basis: [jural-relation, normative-operational-layering, task-cell-system]
---

# Create task record

Admits the holder to create a new file under `work/tasks/`. Tasks are concrete single-sitting
implementation units. They inherit their theory grounding from their parent goal (or from
the corpus atom they realize) — they do not need independent `theory-basis:` derivation, but
must be linked to a goal or corpus atom that has one.

## Multiple holders

Three offices may exercise this power, each with a slightly different scope:

- **records-officer**: any task in `work/tasks/` for any area; the broadest scope.
- **developer**: tasks decomposing realization work into subtasks (e.g., a large realization
  task breaking into "write entity", "write tests", "update CHANGELOG").
- **corpus-tracker**: realization-gap tasks naming an unrealized corpus atom.

## Attached duty

- [`consult-corpus-before-encoding`](../duties/consult-corpus-before-encoding.md) — verify
  task schema against conventions and check the corpus for relevant grounding before writing.

## Does not require

- A `theory-basis:` derivation independent of the parent goal or corpus atom — tasks are leaves.
