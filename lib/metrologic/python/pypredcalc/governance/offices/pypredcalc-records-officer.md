---
title: "PyPredCalc Records Officer"
type: office
slug: pypredcalc-records-officer
scope: pypredcalc-governance
action-domain:
  - create-governance-record
  - modify-governance-record
  - create-work-record
  - modify-work-record
  - commit-changes
deontic-profile:
  create-governance-record: power
  modify-governance-record: power
  create-work-record: power
  modify-work-record: power
  commit-changes: power
  consult-corpus-before-encoding: duty
  commit-references-task-slug: duty
  commit-only-after-acceptance-met: duty
provides-skill:
  - consulting-predication-categories-corpus
  - writing-decision-records
  - writing-specification-records
  - writing-task-records
  - committing-work-cycle
  - writing-commit-message
theory-basis: [office-as-double-settlement, normative-operational-layering, jural-relation, recurrent-practice]
---

# PyPredCalc Records Officer

Presides over the creation and maintenance of PyPredCalc governance and work records. The
defining characteristic of this office is that its powers carry a non-trivial duty: the
officer may not encode a new record without first consulting existing records AND the
predication-categories corpus for improvements to structuration.

This is not courtesy — it is an enforceable constraint via
[`consult-corpus-before-encoding`](../duties/consult-corpus-before-encoding.md).

## Role in plain terms

When the records officer is asked to write a record (a decision, a specification, an office,
a duty, a goal, a task), the workflow is:

1. **Read existing records** in the relevant area. New records often duplicate or contradict
   existing ones; this prevents record rot.
2. **Study the corpus** for how the concept being recorded is theorized. The
   predication-categories corpus is the upstream truth; records should respect its categorical
   structure, not pattern-match against prior records.
3. **Improve structuration first**, then encode. If the corpus reveals a better schema, update
   the draft before writing — schema changes are cheaper before commit than after.

## Boundary with the Developer

The records officer does NOT write source code. The developer does NOT write governance or
work records. When a code change implies a governance change (e.g., a new public API surface
warranting a stability-tier mark, or a workflow pattern worth codifying as a duty), the
developer files an ADR-request triage note for the records-officer to author.

## Boundary with the Steward

The records officer creates and modifies records; the steward ratifies them when they touch
hard-core C. A draft ADR amending a charter commitment is the records-officer's product; the
steward (and ultimately the captain) ratifies before the draft becomes binding.

## Scope

- **Read** (privilege): all of `governance/`, `work/`, `theories/.../predication-categories/`.
- **Write** (power): `pypredcalc/governance/` (any subdir); `pypredcalc/work/` (any subdir).

## Skills held

- [`consulting-predication-categories-corpus`](../skills/consulting-predication-categories-corpus.md) —
  reads the corpus to ground a record's structuration.
- [`writing-decision-records`](../skills/writing-decision-records.md) — produces an ADR.
- [`writing-specification-records`](../skills/writing-specification-records.md) — produces a
  specification.
- [`writing-task-records`](../skills/writing-task-records.md) — produces a task record.

## Incumbency

Currently held informally by the captain plus contracted inference sessions. Formal
incumbency deferred.

Formal incumbency record: [`emsenn-incumbency`](../personnel/emsenn-incumbency.md) — captain holds this office informally pending substrate-driven dispatch.
