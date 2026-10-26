---
title: "PyPredCalc record-format conventions"
type: conventions
status: active
version: "0.2"
---

# PyPredCalc record-format conventions

Authoritative schema for records under [`governance/`](.) and [`work/`](../work/). This
document binds the *form* records take; the *constraints on what records require* are
encoded as duties under [`duties/`](duties/).

PyPredCalc is a PyFARS instance — `pyfars run pypredcalc/` is the operational target — so
these conventions track [PyFARS's record conventions](../../platform/pyfars/governance/conventions.md)
where they apply, and deviate only where pypredcalc's smaller scope warrants it.

## Record kinds

Records are markdown files with YAML frontmatter. One entity per file. Filenames are
lower-kebab-case slugs.

| `type:` value | Lives under | Used for |
|---|---|---|
| `enterprise` | `governance/enterprise.md` | The single enterprise record. |
| `charter` | `governance/charter.md` | The single charter record. |
| `conventions` | `governance/conventions.md` | This document. |
| `decision` | `governance/decisions/<slug>.md` | An ADR. |
| `specification` | `governance/specifications/<slug>.md` | A binding shape spec. |
| `office` | `governance/offices/<slug>.md` | An office record. |
| `jural-relation` | `governance/powers/<slug>.md` or `governance/duties/<slug>.md` | A power, privilege, immunity, or duty. |
| `agent` | `governance/agents/<slug>.md` | An agent record (LLM-backed, unix-tool, etc.). |
| `index` | any `_index.md` | Navigation index for a directory. |
| `task` | `work/tasks/<slug>.md` | A leaf executable unit. |
| `goal` | `work/goals/<slug>.md` | An outcome under which tasks group. |
| `question` | `work/questions/<slug>.md` | An open development-side question. |
| `inquiry` | `work/inbox/<slug>.md` | An incoming message from a downstream consumer. |
| `triage-note` | `work/inbox/<slug>.md` | A short note flagging something for routing. |
| `audit` | `work/audits/<slug>.md` | A coverage report or other audit output. |
| `novation` | `governance/decisions/novation-<slug>-<date>.md` | A hard-core amendment witness. |

## Frontmatter conventions

Every record carries:

- `title:` — human-readable title.
- `type:` — the record kind from the table above.
- `status:` — lifecycle state per the kind.

Records in `governance/` additionally carry:

- `slug:` — usually matches filename; load-bearing for cross-reference.
- `theory-basis:` (where applicable) — list of corpus atoms the record draws on.

Jural-relation records carry the cells per the
[`jural-relation`](../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/)
theory:

- `kind:` — `power | duty | privilege | immunity`.
- `active-holder:` — the office (or list of offices) that holds the relation.
- `passive-party:` — the community on which the correlate falls.
- `scope-action:` — the operation the relation covers.
- `correlate-of:` — `liability | no-right | disability` (for power, privilege, immunity).
- `triggering-powers:` (duties only) — the powers whose exercise fires the duty.
- `required-action:` (duties only) — what must be done to discharge the duty.

### Goal records (`type: goal`)

Per [`specifications/work-dispatch-readiness.md`](specifications/work-dispatch-readiness.md):

- `horizon:` — required. One of `now | soon | later | someday | done`.
- `priority:` — optional integer; defaults to 100 when absent.
- `owner-office:` — required. The office accountable for advancing the goal.
- `created-at:` — required. ISO date (`YYYY-MM-DD`).
- `tasks:` — list of task slugs the goal groups; each named slug must
  resolve to a record under `work/tasks/`.
- `theory-basis:` — corpus atoms grounding the goal.

### Task records (`type: task`)

Per [`specifications/work-dispatch-readiness.md`](specifications/work-dispatch-readiness.md):

- `horizon:` — required. Same enum as goals.
- `priority:` — optional integer; defaults to 100.
- `goal:` — required. Slug of the parent goal; must resolve to a non-terminal goal record.
- `requires-capability:` — required. Skill slug (or list) used for dispatch matching.
- `requires-brief:` — optional boolean. When `true`, the task additionally must carry a `brief:` cell pointing at an existing file under `work/briefs/`.
- `brief:` — required when `requires-brief: true`. Path to the brief.
- `depends-on:` — optional list of task slugs. Each must resolve to a task record; the dispatch-readiness rule treats unfilled dependencies as $\bot$ and non-`done` ones as $\mathbf{f}$.
- `requires-authority:` — optional. Power slug whose holder has standing to dispatch the task.
- `owner-office:` — optional. When set, bypasses XO routing.
- `corpus-slug:` — required for tasks realising a corpus entity. The atom path (e.g., `objects/quantale-enriched-sheaf`).
- `created-at:` — required. ISO date.
- `created-by:` — optional. Office that filed the task.

The four-valued **dispatch readiness** of a task is *computed* from
these cells via the skill
[`computing-dispatch-readiness`](skills/computing-dispatch-readiness.md);
declared `status: ready` is informational and may be overridden by
the witness. Three duties enforce the cell schema and the
witness-derivation discipline:

- [`tasks-requiring-brief-have-brief-cell-and-file`](duties/tasks-requiring-brief-have-brief-cell-and-file.md)
- [`tasks-cite-dependencies-in-depends-on-cell`](duties/tasks-cite-dependencies-in-depends-on-cell.md)
- [`dispatch-readiness-is-computed-not-declared`](duties/dispatch-readiness-is-computed-not-declared.md)

### Office records (`type: office`)

Per [`specifications/work-dispatch-readiness.md`](specifications/work-dispatch-readiness.md):

- `provides-skill:` — required list of skill slugs the office can execute.
- `capacity:` — optional. Non-negative integer or the literal `unbounded` (default `unbounded`). The capacity-check is currently advisory; substrate-automation will enforce it.

## Status lifecycle

| Kind | Allowed values |
|---|---|
| `task` | `draft | ready | dispatched | in-progress | partial | done | stalled | abandoned` |
| `goal` | `planning | active | partially-met | met | abandoned` |
| `inquiry` | `open | routed | answered` |
| `decision` | `draft | committed | superseded` |
| `specification` | `draft | active | superseded` |
| `office` | `active | dissolved` |
| `jural-relation` (any kind) | `active | superseded` |
| `agent` | `active | retired` |

Supersession uses `superseded-by:` alongside a terminal status. `superseded` is itself a
status, not a separate field.

## Body format

The body of a record uses GFM markdown. Top-level headings (`#`) are reserved for the
record's title (which usually mirrors the frontmatter `title:`); section headings start at
`##`.

Decision records use the four-section pattern: **What / Why / Rules-out / Does-not-constrain**
(per the charter's instructions tier).

Specification records use whatever section structure fits the spec's content; common shapes
include "Why this exists / The spec / What's bound / What's not bound / Audit".

Office records describe role, boundary with peer offices, scope, powers held, duties incurred,
skills provided, and incumbency.

Jural-relation records describe the action covered, attached duties (for powers), required
action (for duties), correlate position, and enforcement mechanism.

## Source-of-truth ordering

When sources disagree, the lower-numbered source wins:

1. `theories/.../predication-categories/` — the corpus, the math.
2. [`charter.md`](charter.md) — hard core C.
3. [`enterprise.md`](enterprise.md) — current (C, Γ, O).
4. [`decisions/`](decisions/) — committed ADRs.
5. [`specifications/`](specifications/) — module/API contracts.
6. [`offices/`](offices/), [`powers/`](powers/), [`duties/`](duties/), [`skills/`](skills/),
   [`agents/`](agents/) — the agential apparatus.
7. **`conventions.md`** — this document.
8. `work/` — work records.
9. `src/` — source code.

This document can be amended only by an ADR in [`decisions/`](decisions/) — not by task
completion or code change.
