---
title: "PyPredCalc work"
type: index
status: open
---

# PyPredCalc work

Active development tracking for PyPredCalc. The structure mirrors PyFARS's `work/`,
trimmed where a math library doesn't need the full machinery.

| Subdir | What's in it |
|---|---|
| [`goals/`](goals/) | Outcomes that group multiple tasks. Each goal has theory-grounding and acceptance criteria. |
| [`tasks/`](tasks/) | Leaf executable units currently dispatchable, organized by area: `tasks/engineering/`, `tasks/governance/`. |
| [`backlog/`](backlog/) | Tasks not currently scheduled. |
| [`briefs/`](briefs/) | Realization briefs (corpus-reader output) — one file per atom warranting deep reading before realization. |
| [`audits/`](audits/) | Coverage reports and other audit outputs from the corpus-binding audit. |
| [`inbox/`](inbox/) | Inquiries from downstream consumers (PyFARS, predicated-computing realizations); answered in place. |
| [`questions/`](questions/) | Open development-side questions — should X be in the public API? Does Y need a separate subpackage? Closed when answered. |

Larger structures (campaigns, milestones, objectives) are not yet warranted; the library's
pace doesn't need that level of decomposition.

## Source-of-truth ordering

Work records are level 7 in the source-of-truth chain (per
[`governance/_index.md`](../governance/_index.md)). They follow charter, enterprise,
decisions, specifications, the agential apparatus, and conventions. Work records can be
amended freely as work progresses; the higher levels bind them.
