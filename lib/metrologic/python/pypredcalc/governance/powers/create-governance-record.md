---
title: "Create governance record"
type: jural-relation
kind: power
slug: create-governance-record
active-holder: pypredcalc-records-officer
passive-party: pypredcalc-community
scope-action: create-file
scope: governance/
correlate-of: liability
duties: [consult-corpus-before-encoding]
enables-skills: [writing-decision-records, writing-specification-records]
theory-basis: [jural-relation, normative-operational-layering, recurrent-practice]
---

# Create governance record

Admits the records-officer to create a new file under `governance/` — a decision, a
specification, an office, a duty/power record, an agent record, an idea record.

## Attached duty

- [`consult-corpus-before-encoding`](../duties/consult-corpus-before-encoding.md) — read
  existing records and study the corpus for structuration improvements *before* writing.
  Skipping the loop is a substrate violation.

## Scope

`pypredcalc/governance/` and any subdirectory.

## Sub-records that follow distinct schemas

When the new record is a jural-relation (power, duty, privilege, immunity), the
[`governance-records-use-jural-relation-schema`](../decisions/governance-records-use-jural-relation-schema.md)
decision binds: `type: jural-relation` with `kind:` sub-classifier.

When the new record is a decision (ADR), the body uses the What / Why / Rules-out /
Does-not-constrain pattern (per [`charter.md`](../charter.md) instructions tier).
