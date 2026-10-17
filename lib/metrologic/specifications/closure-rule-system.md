# Finite FOUR closure-rule declarations

This JSON Schema is the **wire shape** of the existing
`closureRuleSystem(cells, rules)` data-level carrier, not a second rule
language or a new evaluator. Its typed admission and actual meaning are
implemented by
[the closure-rule-system module](../src/articulation/predicating/positing/settling/analysis/closure-rule-system.mjs).

A declaration is a finite list of typed cell keys and positive
knowledge-threshold implications. Each triggered rule **adds** evidence to a
named consequent by the existing FOUR knowledge join; it never removes or
consumes evidence. Contradictory witnesses accumulate to the both-sides value
(`stable` in the current *knowledge* name family), without entailing unrelated
claims. Evaluation uses simultaneous immediate consequences and a
source-independent, code-point-lexical rule order for the replay log.

Example declaration:

```json
{
  "kind": "closureRule.system.carrier",
  "cells": ["claim:A", "claim:B"],
  "rules": [
    {"kind":"closureRule.rule.carrier","name":"observe-against",
     "antecedent":[],"consequent":{"cell":"claim:A","reading":"active"}},
    {"kind":"closureRule.rule.carrier","name":"observe-for",
     "antecedent":[],"consequent":{"cell":"claim:A","reading":"potential"}},
    {"kind":"closureRule.rule.carrier","name":"carry-for",
     "antecedent":[{"cell":"claim:A","atLeast":"potential"}],
     "consequent":{"cell":"claim:B","reading":"potential"}}
  ]
}
```

`closureRuleReceipt(closureRuleSystem(declaration.cells,
declaration.rules), knowledgeLeastValuation(declaration.cells))` gives
`claim:A = stable`, `claim:B = potential`; no explosion.

## Construction and proof boundary

The wire schema checks basic shapes. The **runtime** additionally admits
only genuine cells, validates named readings, rejects unknown rule operators
and dangling references, and requires unique rule names. Positive threshold
conditions are upward-closed under the knowledge order. Consequents are
constant joins; hence the immediate-consequence operator is monotone and
inflationary. Every strictly advancing step writes at least one new
support/denial bit, for at most twice the number of cells; a following stable
step establishes a finite fixed point. Induction from the seed then gives the
**least** closed extension. The runtime witness reports the orbit, lexical
rule-firing trajectory, and derived finite height bound.

This is neither a Lean-kernel theorem certificate nor a general logic
program. In particular, negative-as-failure antecedents, arbitrary code,
resource consumption (linear cut), and quantification over indefinitely
generated domains **are not admitted by this finite grammar**. They require
separately derived mathematical carriers and conformance before an extension
of the executable system. A `Pi_2` transfinite conjecture must not be
represented as though this finite schema executes ordinal limits.

## Consumers and responsibility

The canonical [FOUR glossary](https://github.com/lenticule-science/science-services-section/blob/main/services/philosophy-services-section/services/logic-services-section/content/text/glossary/terms/four.md)
governs interpretation. Generated foundational mathematics and unresolved
transfinite research belong to Lenticule Science / Obsmetrologia; this Data
Engineering module owns the reusable finite execution. Operations may
parameterize declarations and authorize their use for particular services;
neither a declaration nor a successful fixed point authorizes a real-world
action, proves a worldly proposition or transfers a resource. Future
contracted consumers should carry admission, witness identity, and independent
receiving before actions are exposed.
