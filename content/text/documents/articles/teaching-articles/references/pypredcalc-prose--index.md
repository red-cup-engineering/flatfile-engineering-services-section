---
title: PyPredCalc prose
type: reference
status: historical-software-documentation
date-recorded: 2026-10-28
original-source: https://github.com/lenticule-science/science-services-section/blob/f72389d7f80824a2ac16ca5dd201e340bd4ca696/services/philosophy-services-section/services/logic-services-section/content/text/documents/articles/research/pypredcalc/prose/_index.md
source-revision: git-blob:sha1:766b37106d53b3ab6027ed9ed75a484e624ce06e
source-type: index
---
Human-readable documentation for PyPredCalc, structured by Diátaxis-shape:

| Subdir | Shape | What's in it |
|---|---|---|
| [explanations](pypredcalc-prose-explanation--index.md) | reference + conceptual explanation | One page per subpackage, explaining the math the subpackage realizes and the public API. Currently the rendered-docs source (mkdocs reads from here). |
| [`tutorials/`](pypredcalc-prose--index.md) | learning-oriented end-to-end | Stepwise walkthroughs that take a reader from zero to a working calculation. To be authored. |
| [`how-to/`](pypredcalc-prose--index.md) | task-oriented recipes | Short recipes for specific operations (compute a knowledge-meet, build a closure-rule system, evaluate a substitution matrix). To be authored. |

## Candidate documentation

The source how-to and tutorial pages were marked `empty`.
Their unwritten candidate subjects were:

### How-to candidates

- How to evaluate a substitution matrix's exact Perron eigenvalue.
- How to construct a frame morphism between two finite frames and check its homomorphism conditions.
- How to add a new property test under `tests/property/` for a hypothesis-driven invariant.

[Original candidate page](https://github.com/lenticule-science/science-services-section/blob/f72389d7f80824a2ac16ca5dd201e340bd4ca696/services/philosophy-services-section/services/logic-services-section/content/text/documents/articles/research/pypredcalc/prose/how-to/_index.md).

### Tutorial candidates

- Computing a knowledge-meet on the Belnap bilattice from first principles.
- Building a closure-rule system over a small poset and inspecting fixed points.
- Realizing a worked predication-categories example end-to-end against the running PyPredCalc API.

[Original candidate page](https://github.com/lenticule-science/science-services-section/blob/f72389d7f80824a2ac16ca5dd201e340bd4ca696/services/philosophy-services-section/services/logic-services-section/content/text/documents/articles/research/pypredcalc/prose/tutorials/_index.md).
