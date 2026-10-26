---
title: "Audit resolves cross-tree realisation slugs"
type: task
slug: audit-resolves-cross-tree-realization-slugs
status: backlog
horizon: someday
requires-capability: running-corpus-binding-audit
---

# Audit resolves cross-tree realisation slugs

## Description

`governance/skills/running-corpus-binding-audit/audit.py` walks a single `--corpus-root` (default:
the predication-categories math tree). When pypredcalc realises an atom
that lives in an adjacent tree — for example
`@realizes("theorems/dispatch-as-closure-rule-system")` in
`store_closure.dispatch_eligibility_rule`, where the corpus file lives at
`theories/.../predicated-computing/.../agential-orchestration-platform/theorems/dispatch-as-closure-rule-system.md`,
not under predication-categories — the slug is reported as broken even
though the realisation is correctly bound.

The right shape is probably one of:

1. Allow `@realizes("predicated-computing/agential-orchestration-platform/theorems/...")`
   — fully-qualified, audit walks all listed roots.
2. Walk the broader `theories/` root and resolve slugs by stem search across
   relevant atom-type directories. (More expensive; ambiguity risk.)
3. Add a `--corpus-root` repeatable flag and resolve slugs against the
   union.

Option (1) is the most explicit and least surprising; option (3) is the
smallest code change.

## Acceptance

- [ ] Audit no longer reports a broken slug for
      `theorems/dispatch-as-closure-rule-system`.
- [ ] No new false positives on the existing predication-categories
      coverage roll-up.
- [ ] Decision recorded in `governance/decisions/` naming the chosen
      addressing scheme.

## Surfaced from

`add-twist-product-fusion-antecedents` goal. Visible in any audit run on
the current 0.3+ codebase: 1 broken slug on
`theorems/dispatch-as-closure-rule-system`.
