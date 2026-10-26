---
name: "Reading corpus deeply"
description: "Reads a corpus atom and its dependency chain end-to-end, building the understanding required before a realization brief is written. Use as Phase 1 of producing a realization brief."
---

# Reading corpus deeply

## Requirements

- Corpus-reader office.
- A corpus slug to read (from a realization-gap task or a prior brief request).

## Steps

1. Read the corpus markdown file at `theories/.../predication-categories/<type>/<slug>.md`
   in full.
2. Walk the `depends-on:` chain: read each direct dependency. For dependencies that are
   themselves theorems, read the proof sketch.
3. Identify cross-references: `realizes:`, `see-also:`, `instantiates:`. Read those that
   add load-bearing context.
4. For theorems, read at least one example or instance the corpus carries.
5. Note what's *not* in the corpus: ambiguities, undischarged hypotheses, places where
   the proof gestures at "by standard argument" without specifying which.

## Outcomes

A working understanding sufficient to write the realization brief. The reader can answer
"what does realizing this atom require?" and "which dependencies are already realized in
pypredcalc?" without rereading.
