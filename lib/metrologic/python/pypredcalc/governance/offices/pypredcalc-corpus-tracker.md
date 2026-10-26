---
title: "PyPredCalc Corpus Tracker"
type: office
slug: pypredcalc-corpus-tracker
scope: pypredcalc-corpus-relationship
action-domain:
  - read-any-corpus-entity
  - read-any-pypredcalc-source
  - file-realization-gap-task
  - run-corpus-binding-audit
deontic-profile:
  read-any-corpus-entity: privilege
  read-any-pypredcalc-source: privilege
  file-realization-gap-task: power
  run-corpus-binding-audit: power
  maintain-corpus-tracking-loop-integrity: duty
provides-skill:
  - auditing-corpus-realization-coverage
  - identifying-realization-gap
  - running-corpus-binding-audit
theory-basis: [enterprise, normative-operational-layering, jural-relation, dispatch-readiness]
---

# PyPredCalc Corpus Tracker

The Γ-watching office. Reads the predication-categories corpus, identifies realization gaps
(corpus atoms without `@realizes`-bound Python entities), files them as task records for the
developer, and watches for degeneration of the corpus-tracking loop.

## Role in plain terms

The corpus-tracker runs the **upstream cycle** of Γ (per
[`enterprise.md`](../enterprise.md) §Generative Mechanism):

1. **Watch the corpus.** Read `theories/.../predication-categories/` for new or modified
   atoms (concepts, objects, morphisms, theorems, examples). `git log` since the last audit
   plus `pyfars search` give the change set.

2. **Audit realization coverage.** Walk `pypredcalc.src` for `@realizes` decorations,
   collect the set of bound corpus slugs, diff against the corpus's atom set. The unrealized
   atoms are the gap.

3. **File realization-gap tasks.** For each gap of sufficient maturity (the corpus atom is
   `status: proved` or `status: defined`, not `draft`), create a task record describing the
   realization to write. Set `requires-capability: realizing-corpus-atom-as-python` so the
   XO can dispatch to the developer.

4. **Watch for degeneration.** When the audit reports either zero new atoms over a long
   stretch (Γ exhaustion) or persistent unresolved gaps (Γ stagnation downstream of the
   developer), file a degeneration signal triage note for the steward.

## Boundary with the Developer

The corpus-tracker does NOT realize gaps itself. It identifies them and files tasks. The
developer holds [`write-pypredcalc-source`](../powers/write-pypredcalc-source.md); the
corpus-tracker does not.

## Boundary with the XO

The corpus-tracker produces tasks; the XO dispatches them. The corpus-tracker does not
route or close tasks.

## Boundary with the Steward

The corpus-tracker reports Γ degeneration; the steward acts on the report. The corpus-tracker
does not amend C or restructure O.

## Privileges

Two privilege records: [`read-any-corpus-entity`](../powers/read-any-corpus-entity.md)
(the corpus is the upstream truth) and [`read-any-pypredcalc-source`](../powers/read-any-pypredcalc-source.md)
(needed to walk decorations).

## Tools

Primary tool: the audit at `governance/skills/running-corpus-binding-audit/audit.py` (modeled as the
[`pypredcalc-audit-tool`](../agents/pypredcalc-audit-tool.md) agent record). The
corpus-tracker invokes it via [`run-corpus-binding-audit`](../powers/run-corpus-binding-audit.md).

## Incumbency

Currently held informally by the captain plus the audit script. Formal incumbency deferred.

Formal incumbency record: [`emsenn-incumbency`](../personnel/emsenn-incumbency.md) — captain holds this office informally pending substrate-driven dispatch.
