---
title: "Run corpus-binding audit"
type: jural-relation
kind: power
slug: run-corpus-binding-audit
active-holder: pypredcalc-corpus-tracker
passive-party: pypredcalc-community
scope-action: execute-audit-tool
correlate-of: liability
duties: [maintain-corpus-tracking-loop-integrity]
enables-skills: [running-corpus-binding-audit, auditing-corpus-realization-coverage]
theory-basis: [jural-relation, normative-operational-layering]
---

# Run corpus-binding audit

The corpus-tracker may execute the audit tool at `governance/skills/running-corpus-binding-audit/audit.py` (modeled
as the [`pypredcalc-audit-tool`](../agents/pypredcalc-audit-tool.md) agent record). The audit:

1. Walks `pypredcalc.src` collecting every `@realizes("type/slug")` decoration.
2. Resolves each slug against the corpus markdown tree.
3. Reports two things: unresolved slugs (governance violation — the decoration points at
   nothing), and corpus atoms with no incoming decoration (realization gap).

## Attached duty

- [`maintain-corpus-tracking-loop-integrity`](../duties/maintain-corpus-tracking-loop-integrity.md) —
  audits run periodically; degeneration signals are filed when found.

## Output

A coverage report in `work/audits/` (or piped to a triage note in `work/inbox/` for the XO
when degeneration is detected).
