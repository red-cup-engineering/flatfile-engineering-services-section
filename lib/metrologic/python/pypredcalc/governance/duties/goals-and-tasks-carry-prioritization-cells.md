---
title: "Goals and tasks carry prioritization cells"
type: jural-relation
kind: duty
slug: goals-and-tasks-carry-prioritization-cells
status: superseded
superseded-by:
  - tasks-requiring-brief-have-brief-cell-and-file
  - tasks-cite-dependencies-in-depends-on-cell
  - dispatch-readiness-is-computed-not-declared
superseded-at: "2026-05-08"
active-holder: pypredcalc-records-officer
passive-party: pypredcalc-community
scope-action: enforce-prioritization-cell-presence
triggering-powers:
  - create-work-record
  - modify-work-record
required-action: ensure-required-cells-present
enforcement: substrate-violation
rule-type: N→O
binds-specification: work-prioritization
theory-basis:
  - dispatch-readiness
  - normative-operational-layering
  - jural-relation
  - task-cell-system
---

# Goals and tasks carry prioritization cells

> **Superseded** the same day this was committed. The cell-presence
> requirement decomposed into three sharper duties:
> [`tasks-requiring-brief-have-brief-cell-and-file`](tasks-requiring-brief-have-brief-cell-and-file.md),
> [`tasks-cite-dependencies-in-depends-on-cell`](tasks-cite-dependencies-in-depends-on-cell.md),
> and the XO-side
> [`dispatch-readiness-is-computed-not-declared`](dispatch-readiness-is-computed-not-declared.md).
> The full cell schema now lives in the spec
> [`work-dispatch-readiness`](../specifications/work-dispatch-readiness.md);
> records-officer enforcement of the schema is shared across the
> three superseder duties. This record is retained for audit trail.

Every `goal` and `task` record under `work/` MUST carry the prioritization
cells specified in
[`../specifications/work-prioritization.md`](../specifications/work-prioritization.md).
The records-officer enforces this when creating or modifying work records.

The duty exists because the XO's
[`selecting-next-work`](../skills/selecting-next-work.md) skill is only
deterministic over records that carry the cells. A record with no `horizon:`
breaks the queue's lex order; a task with no `goal:` cannot be classified by
its parent goal's horizon; a task with no `requires-capability:` cannot be
dispatched.

## Required cells

### On every `goal` record

| Cell | Required | Notes |
|---|---|---|
| `horizon:` | yes | Value in `now | soon | later | someday | done`. |
| `priority:` | optional | Integer; defaults to 100 when absent. |
| `owner-office:` | yes | The office accountable for advancing the goal. |
| `created-at:` | yes | ISO date. |
| `status:` | yes | Per the goal lifecycle in conventions. |

### On every `task` record

| Cell | Required | Notes |
|---|---|---|
| `horizon:` | yes | Value in the same enum. |
| `priority:` | optional | Defaults to 100. |
| `goal:` | yes | Slug of the parent goal. |
| `requires-capability:` | yes | Skill slug for dispatch matching. |
| `owner-office:` | optional | When set, bypasses XO routing. |
| `created-at:` | yes | ISO date. |
| `status:` | yes | Per the task lifecycle in conventions. |

## Triggering powers

The duty fires whenever a power that creates or modifies a work record is
exercised:

- [`create-work-record`](../powers/create-work-record.md) — by any office
  authorised to spawn goals or tasks (corpus-tracker for realization-gap tasks,
  records-officer for governance tasks, captain for any record).
- [`modify-work-record`](../powers/modify-work-record.md) — when an existing
  record is amended, the cell set is re-checked.

The records-officer's review of a created or modified record discharges the
duty. A record that omits a required cell is non-conformant; the records-officer
either adds the cell (when the value is unambiguous) or returns the record to
its creator with a note (`returned-for-prioritization-cells`).

## Enforcement

Pre-substrate (current state):

- Code review on the PR or commit that introduces or modifies the record.
- Manual scan: `grep` over `work/goals/*.md` and `work/tasks/**/*.md` for
  records missing `horizon:` or other required cells.

Post-substrate-automation:

- A closure rule fires when `create-work-record` or `modify-work-record`
  produces a record event. The rule's antecedent atom checks that
  `cell(record, horizon)` and the other required cells have post-closure
  truth-side values. A `⊥`-valued cell on a required field generates a
  governance-rule violation event.

## Discharging

The duty is discharged when the record carries every required cell at a
post-closure (settled) value. `horizon: now` and `horizon: someday` are both
discharging — the duty cares about presence, not about which value.

## Why an N→O duty

Per [`normative-operational-layering`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/normative-operational-layering.md),
N→O rules turn normative configuration into operational state — here, the
records-officer's normative duty turns into an operational change to the work
record (cell added or record returned). The duty itself does not directly
modify the substrate; it requires the records-officer to take an action that
does.

## Backfill

When this duty is first installed, existing records may not yet carry every
required cell. The records-officer runs a one-time backfill: scan
`work/goals/` and `work/tasks/`, add missing cells, return ambiguous cases to
the captain. After backfill, the duty fires on every new or modified record.
