---
name: "Running corpus-binding audit"
description: "Executes the corpus-binding audit script and surfaces any unresolved @realizes slugs as substrate violations. Use periodically and before every release."
---

# Running corpus-binding audit

The corpus-binding direction is Python → corpus: every `@realizes("type/slug")`
decoration in `pypredcalc.src` MUST resolve to a real corpus markdown file.
This skill runs the verification.

## Requirements

- `pypredcalc-corpus-tracker` office (or substrate dispatch invoking the
  [`pypredcalc-audit-tool`](../../agents/pypredcalc-audit-tool.md) agent).
- The audit script alongside this `SKILL.md`: [`audit.py`](audit.py).

## Steps

1. Execute: `python governance/skills/running-corpus-binding-audit/audit.py`.
2. The script walks `pypredcalc.src` collecting every `@realizes("type/slug")`
   decoration.
3. For each slug, check the corpus markdown exists at the expected path.
4. The script reports two things:
   - **Unresolved slugs** — decoration points at a corpus file that doesn't
     exist (path typo, corpus rename without `@realizes` update, cross-tree
     slug not yet supported).
   - **Resolved slugs** — decoration points at a real corpus file.
5. Exit code is `0` iff every slug resolves. Non-zero unresolved → substrate
   violation of [`decorate-every-realization`](../../duties/decorate-every-realization.md);
   file a triage note for the `pypredcalc-records-officer` to investigate.

## Outcomes

Audit report (stdout). Zero unresolved = clean. Non-zero unresolved =
substrate violations to remediate before the next release.

## Companion skill

[`auditing-corpus-realization-coverage`](../auditing-corpus-realization-coverage/SKILL.md)
invokes the same script and reads the *coverage* section of the report rather
than the *violation* section.
