---
title: "pypredcalc-corpus-reader-agent"
description: "LLM-backed agent that performs deep mathematical reading of corpus atoms and produces realization briefs. Incumbent of the pypredcalc-corpus-reader office."
kind: llm-backed-agent
role: pypredcalc-corpus-reader
incumbent-of: pypredcalc-corpus-reader
duties: [produce-brief-before-recommending-realization]
powers: [produce-realization-brief]
privileges: [read-any-corpus-entity, read-any-pypredcalc-source]
provides-skill:
  - reading-corpus-deeply
  - producing-realization-brief
  - identifying-load-bearing-dependencies
jurisdiction:
  read: [theories/.../predication-categories/, src/, work/tasks/, work/briefs/]
  write: [work/briefs/]
escalates:
  - Corpus inconsistencies (file as upstream question, not as a brief).
  - Atoms whose dependencies are themselves un-realized (file a triage note for the corpus-tracker).
---

# pypredcalc-corpus-reader-agent

The LLM-backed agent contracted into the
[`pypredcalc-corpus-reader`](../offices/pypredcalc-corpus-reader.md) office. Reads corpus
atoms deeply and produces realization briefs at `work/briefs/`.

The substrate selects the inference model at runtime — pypredcalc governance is model-
agnostic. This record describes the role's prompt and capabilities; concrete inference
selection happens in PyFARS dispatch.

## Cadence

Triggered by realization-gap tasks tagged `requires-brief: true` (set by the corpus-
tracker). The agent reads the named atom, walks its dependency chain, produces the
brief, and marks the brief `status: committed`. The XO can then dispatch the developer
to act on the brief.
