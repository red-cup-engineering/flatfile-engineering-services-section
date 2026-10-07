---
title: "Relational simulation specifications: capability disposition"
date-created: 2026-09-25
type: note
status: current
source-legacy-directory: "2026-03-04-semiotic-repository-specifications"
---

# Relational simulation specifications: capability disposition

The 2026-03-04 bundle was 36 Markdown design sketches, not a running
repository or a shared "relational computer" implementation.  Each sketch
used the same state/input/procedure/invariant/output template and presented a
finite simulator as if its named theorem had already supplied a runtime
operation.  No implementation, consumer, data format, or executable theorem
witness accompanied those claims.

The useful work survives by effect, not by recreating the bundle as a generic
simulation engine.

| Proposed effect | Modern carrier | Boundary |
| --- | --- | --- |
| Admit typed, content-addressed observations and retain their references | `computer-data-engineering-services-section/src/signcell/semantic-cell.mjs` | data |
| Represent a closed typed relation graph, reject invalid edges, and merge compatible graph cuts | `computer-data-engineering-services-section/src/signcell/semantic-graph.mjs` | data |
| Inspect Markdown and other flatfile resources as evidence-bearing relation graphs | `computer-content-engineering-services-section/services/flatfile-resource-graph-service` | data |
| Keep service records, state, and logs in distinct verified custody locations | `computer-file-engineering-services-section/services/flatfile-engineering-services-section/services/data-custody-directory-service` | data |
| Receive, authenticate, retain, publish, and deliver ActivityPub activities | `computer-networking-engineering-services-section/services/activitypub-services-section` | networking |

In particular, the old `knowledge-graph`, `audit`, `storage`, `intake-stack`,
`traceability-graph`, `replication`, and `semiotic-activitypub` sketches do
not justify a second graph, provenance, storage, policy, or federation layer
inside a downstream system.  A consuming application may compose the listed
carriers and record its own domain policy; it must not depend on an imagined
universal state, TracePoint database, or hypertensor runtime.

The remaining sketches are proposals for finite mathematical experiments:
`baseline-renewal`, `markov-dynamics`, `measurement-algebra`,
`heyting-algebra`, `modal-logic`, `modality-tower`, `directed-homotopy`,
`directed-stratified-site`, `infinity-site`, `sheaf-topos`, `stlc`,
`parametric-semantics`, `spectral-theorem`, the three quasicrystalline
hypertensor texts, `universal-state`, and `topology-integration`.  Their
scientific vocabulary belongs to the existing mathematics records, including
the definitions of [directed homotopy](../../../../../../../../../../../../../../../../../../../../../science-services-section/services/information-science-services-section/services/math-services-section/content/text/glossary/terms/directed-homotopy.md),
[Heyting algebra](../../../../../../../../../../../../../../../../../../../../../science-services-section/services/information-science-services-section/services/math-services-section/content/text/glossary/terms/heyting-algebra.md),
and [sheaf](../../../../../../../../../../../../../../../../../../../../../science-services-section/services/information-science-services-section/services/math-services-section/content/text/glossary/terms/sheaf.md).
They remain hypotheses or experiment briefs until a named user/domain supplies
finite input data, a transformation, and an observable result.  The legacy
claims that these are "earned theorems" or a common universal state are not
evidence of such a capability.

`network`, `scheduler`, `concurrency`, `policy`, `introspection`, `interface`,
and `testing` describe ordinary application concerns, but specify no coherent
carrier independent of an application.  They are therefore not promoted into
a cross-cutting runtime.  Concrete applications own their dispatch, policy,
measurement, and release behavior while depending upstream on data, code, and
networking capabilities as needed.

This disposition retires the legacy simulation-specification directory.  It
preserves the concrete effects in their proper upstream owners and preserves
the mathematical context without treating speculative architecture as shipped
software.
