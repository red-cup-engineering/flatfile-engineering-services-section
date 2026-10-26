---
title: "Agents"
type: index
status: open
---

# Agents

Agent records: the entities that execute work on PyPredCalc. Two kinds:

1. **LLM-backed agents** — role descriptions for inference-driven labor. The agent record
   names the role's prompt and capabilities; the substrate (PyFARS dispatch) selects the
   concrete inference model at runtime. Pypredcalc governance does NOT specify which
   inference model fulfills the role — that is the substrate's job.
2. **Unix-tool agents** — deterministic scripts wired into substrate dispatch.

Per the [directory schema RFC](../../../../platform/pyfars/governance/specifications/directories.md)
§5.1, agents are governance entities — what acts on this container's behalf.

## LLM-backed agents

| Slug | Office | Notes |
|---|---|---|
| [`pypredcalc-corpus-reader-agent`](pypredcalc-corpus-reader-agent.md) | corpus-reader | Deep mathematical reading; produces realization briefs. |
| [`pypredcalc-developer-agent`](pypredcalc-developer-agent.md) | developer | Writes realizations; primary implementation labor. |
| [`pypredcalc-test-author-agent`](pypredcalc-test-author-agent.md) | test-author | Writes unit and property tests. |
| [`pypredcalc-quality-officer-agent`](pypredcalc-quality-officer-agent.md) | quality-officer | Code review; merge-gating verdicts. |
| [`pypredcalc-release-officer-agent`](pypredcalc-release-officer-agent.md) | release-officer | Release-pipeline work. |
| [`pypredcalc-docs-officer-agent`](pypredcalc-docs-officer-agent.md) | docs-officer | Prose documentation. |
| [`pypredcalc-algebra-specialist-agent`](pypredcalc-algebra-specialist-agent.md) | algebra-specialist | Bilattice / twist-product / residuated-lattice work. |
| [`pypredcalc-predication-specialist-agent`](pypredcalc-predication-specialist-agent.md) | predication-specialist | Calculator-surface work. |
| [`pypredcalc-combinatorics-specialist-agent`](pypredcalc-combinatorics-specialist-agent.md) | combinatorics-specialist | Poset / simplicial / propositional-rule work. |
| [`pypredcalc-topology-specialist-agent`](pypredcalc-topology-specialist-agent.md) | topology-specialist | Alexandrov / Priestley / transfinite-cell work. |
| [`pypredcalc-lattice-specialist-agent`](pypredcalc-lattice-specialist-agent.md) | lattice-specialist | Frame / d-frame work. |
| [`pypredcalc-sheaf-specialist-agent`](pypredcalc-sheaf-specialist-agent.md) | sheaf-specialist | Cellular / frame-valued / q-enriched sheaves. |
| [`pypredcalc-dynamics-specialist-agent`](pypredcalc-dynamics-specialist-agent.md) | dynamics-specialist | Substitution matrices and named instances. |

## Unix-tool agents

| Slug | Office | Notes |
|---|---|---|
| [`pypredcalc-audit-tool`](pypredcalc-audit-tool.md) | corpus-tracker | `governance/skills/running-corpus-binding-audit/audit.py`; corpus-binding audit. |
| [`pypredcalc-mypy-tool`](pypredcalc-mypy-tool.md) | quality-officer | `mypy --strict`; type discipline. |
| [`pypredcalc-ruff-tool`](pypredcalc-ruff-tool.md) | quality-officer | `ruff check`; lint discipline. |

## Polity-scope generic agents

LLM endpoint records are not agents; they live at the polity's
[`assets/computing/endpoints/`](../../../../../governance/assets/) — they are inference
services the dispatcher selects from, not roles. Polity-scope generic agents
(architect, code-reviewer, build-error-resolver, etc.) live at
[`561/governance/agents/`](../../../../../governance/agents/) and are dispatchable to
PyPredCalc work without needing PyPredCalc-specific records.
