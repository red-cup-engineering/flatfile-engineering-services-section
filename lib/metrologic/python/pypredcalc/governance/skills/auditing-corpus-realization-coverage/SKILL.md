---
name: "Auditing corpus realization coverage"
description: "Produces a coverage report listing predication-categories atoms with no @realizes-bound Python entity. Use at the start of a corpus-tracking-loop cycle."
---

# Auditing corpus realization coverage

PyPredCalc aims to realize the realizable atoms of the predication-categories
corpus (objects, morphisms, theorems; eventually concepts and examples — not
narratives or questions). This skill measures progress and surfaces what
remains to be realized.

## Requirements

- `pypredcalc-corpus-tracker` office.
- `git log` access to `theories/.../predication-categories/`.
- The audit script at
  [`../running-corpus-binding-audit/audit.py`](../running-corpus-binding-audit/audit.py)
  — this skill is the coverage-reading counterpart of the violation-reading
  skill that owns the script.

## Steps

1. Find new or modified corpus atoms since the last audit:
   `git log --since=<date> -- theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/`.
2. Run
   `python governance/skills/running-corpus-binding-audit/audit.py --report-orphans`.
3. Read the **Coverage** section of the audit's stdout: per-type counts
   (concepts/objects/morphisms/theorems/examples) of realized vs. total atoms.
4. Diff the new audit's realized-slug set against the prior audit's:
   - **New realizations** = realizations added since prior audit.
   - **New gaps** = corpus atoms added since prior audit with no realization.
   - **Persistent gaps** = atoms unrealized in both prior and current audit.
5. Write a coverage report at `work/audits/coverage-<date>.md` with:
   - Per-type coverage (objects/morphisms/theorems/concepts/examples).
   - Lists of new realizations, new gaps, persistent gaps.
   - Any unresolved `@realizes` slugs (governance violations — these are the
     [`running-corpus-binding-audit`](../running-corpus-binding-audit/SKILL.md)
     surface, copied through to the coverage report for visibility).

## Outcomes

A dated coverage report. The corpus-tracker uses this to file realization-gap
tasks (via `identifying-realization-gap`) and degeneration signals (via
`maintain-corpus-tracking-loop-integrity`).
