---
title: "Work dispatch — substrate-native closure rules and moduli"
type: question
slug: work-dispatch-as-closure-rule-system
status: partially-answered
horizon: later
created-at: "2026-05-08"
created-by: pypredcalc-records-officer
theory-basis:
  - dispatch-as-closure-rule-system
  - dispatch-readiness
  - closure-rule-language
  - closure-rule-system
  - restructure-as-visible-automorphism
  - twist-product-residuation
binds-specification: work-dispatch-readiness
---

# Work dispatch — substrate-native closure rules and moduli

> **Partially answered (2026-05-08).** The original framing of this
> question — "the current dispatch-readiness rule is a procedural
> skill; encode it as a closure rule" — is now realised by
> [`governance/skills/computing-dispatch-readiness/dispatch.py`](../../governance/skills/computing-dispatch-readiness/dispatch.py).
> The work tree is loaded as a `PredicationStore`; the readiness
> preconditions (brief / dependency / capability / authority /
> goal-active / status-eligible / composite) are emitted as
> `StoreRule` objects; the closure system runs to fixpoint; the
> per-task verdict is read off the `dispatch-readiness` cell.
>
> Two genuine open sub-questions remain — see below. The original
> framing is preserved beneath for the audit trail.

## Open sub-questions remaining

### Q1 — Full $\delta$-residuation in the capability rule

The substrate-native `capability-matched` rule currently fires when
each $\mathbf{t}$-required capability has *some* office providing it
at $\mathbf{t}$. The corpus's
[`dispatch`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/morphisms/dispatch.md)
morphism is sharper:

$$\delta(O, T) = \bigwedge_{c \in C}^{(t)} (\rho_T(c) \Rightarrow \sigma_O(c))$$

with $\Rightarrow$ the
[`twist-product-residuation`](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/theorems/twist-product-residuation.md)
on $\mathbf{FOUR}$. This handles cases the current rule cannot:

- A capability that's $\bot$-required ("preferable but not required"):
  the current rule treats this as "doesn't matter"; the residuation
  rewards offices that nonetheless provide it.
- A capability that's $\mathbf{f}$-required ("must not have"): the
  current rule ignores this; the residuation makes it
  $\delta$-blocking.
- An office whose `provides-skill` carries a $\bot$ — not the same as
  "doesn't provide"; the residuation distinguishes them.

**What's needed.** Encode the per-(task, office) residuation as a
`StoreFusionAntecedent` (or a sequence of cell-atom antecedents that
compute the same value). The `dispatch_eligibility_rule` function in
`pypredcalc.predication.store_closure` is the right model — it
already uses fusion antecedents at the FOUR-bilattice level.

**Captain decision needed?** No — the math is in the corpus, the
substrate already supports fusion antecedents, the work is
mechanical once a task's capability section is non-trivial. Filed
to wait for a task whose capabilities aren't all $\mathbf{t}$-required;
the current work tree does not exercise this surface.

### Q2 — Work-tree moduli and equivalent tasks

The corpus theorem
[`restructure-as-visible-automorphism`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/restructure-as-visible-automorphism.md)
makes substrate symmetries visible: a permutation of entities that
preserves the closure rule system is an automorphism of the
operations-settling. Two tasks $T_1, T_2$ are *equivalent under a
work-tree automorphism* iff there is a substrate-symmetry sending
one to the other.

For the current pypredcalc work tree, no two tasks are equivalent in
this sense — each targets a unique corpus slug. So the moduli
question doesn't bite operationally. But the spec's tiebreak still
falls through to slug order, which is structurally arbitrary.

**Two real sub-questions for the captain:**

- **Q2a — What is a work-tree automorphism?** A permutation of task
  / goal / office slugs that preserves the closure rule system (the
  readiness rule's antecedents and consequents are invariant under
  the permutation)? Or something stronger — a permutation that also
  preserves the corpus-binding decorations (so equivalent tasks
  realize the same corpus atom)? Or weaker — a permutation that
  preserves only the dispatch verdict?
- **Q2b — When does the moduli classification matter?** The
  current tree has no equivalent tasks. If we ever have two tasks
  realizing $\rho$ and $\sigma(\rho)$ for some $\sigma$ in the
  substrate's symmetry group, we'd want the dispatcher to pick one
  *as a representative*, not arbitrarily by slug. But no such pair
  exists today. Should we plumb the moduli machinery proactively,
  or wait for the first equivalent pair?

**Captain decision needed.** The math is ready; the engineering
cost is moderate (need to define the symmetry group, lift it into
substrate cells, encode the moduli-collapse as a closure rule). But
without a concrete instance of equivalent tasks, the work has no
bite. Filing as `partially-answered` with these two sub-questions
open.

---

## Original framing — preserved for audit trail

## Why

PyPredCalc 0.3 unreleased ships
`predication.store_closure.dispatch_eligibility_rule(...)` as the
realization of corpus theorem
[`dispatch-as-closure-rule-system`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theorems/dispatch-as-closure-rule-system.md).
The substrate already has the shape: a closure rule whose
antecedents are bilattice-valued atoms over a predication store,
whose consequents update cells. The work-priority rule is exactly
this shape, just with the work tree as the store.

Migrating the rule from procedural-skill to closure-rule has three
benefits:

1. **The rule becomes self-realizing.** The math floor pypredcalc
   provides is what runs the rule. There is no "skill that walks the
   tree" — the substrate IS the walk.
2. **The witness becomes a derived cell.** Dispatch readiness is a
   substrate cell whose value is computed by the closure rule's
   fixpoint. Other rules can compose on it (e.g., a dispatch-act
   rule that fires only when readiness is post-closure $\mathbf{t}$).
3. **The N→O layering becomes legible.** The corpus's
   [normative-operational-layering](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/normative-operational-layering.md)
   says duties are N→N rules whose consequences gate operational
   events via N→O rules. A markdown duty cannot fire a closure rule;
   a substrate-native duty can.

## What the migration would entail

1. Encode each work record as cells in a `PredicationStore`. Cells
   include task identity, status, horizon, dependencies, brief
   reference, capability requirements, etc. Each cell carries a
   bilattice value.

2. Write the readiness rule as a `StoreRule`:

   ```
   READINESS_RULE = store_rule(
     antecedent = And(
       cell_atom("status",  task) ≥_k  "ready",
       cell_atom("brief_satisfied", task) ≥_k t,
       cell_atom("dependencies_done", task) ≥_k t,
       cell_atom("capability_provided", task) ≥_k t,
       cell_atom("authority_held", task) ≥_k t,
     ),
     consequent = update("dispatch_readiness", task, t),
   )
   ```

   The brief / dependency / capability / authority sub-conditions
   are themselves consequents of separate rules that read the work
   tree and write the booleanized witness cells.

3. Replace `selecting-next-work` with a procedure that:
   - Builds the store from the work tree.
   - Runs the closure rule system to fixpoint (the corpus's
     `dispatch-readiness-regime-is-strict` theorem bounds this in
     finitely many steps for finite work trees).
   - Reads off the tasks whose `dispatch_readiness` cell is post-
     closure $\mathbf{t}$ and applies the same lex-ordering tuple.

## Open sub-questions

- **What's the substrate-cell encoding of the work tree?** Each task
  is an entity; each cell is a `(task, attribute, value)` triple.
  The schema must be precise enough that the closure rule can read
  `cell("requires-brief", task) = t` and route accordingly.
- **Where do file-system facts enter the substrate?** The brief
  precondition needs "the brief file exists." The substrate is
  in-memory; file-existence is a side fact. The clean answer is a
  loader that pre-populates `cell("brief_exists", task) = t / f` by
  consulting the file system before running the rule. The dirty
  answer is calling out to the FS during rule evaluation.
- **What's the relation between this in-pypredcalc realization and
  the polity-level pyfars realization?** PyFARS already has its own
  dispatch infrastructure for the polity. PyPredCalc's work tree is
  a much smaller substrate. Whether the same rule expression is
  used in both, or whether pypredcalc's is a smaller subset, is
  open.
- **What's the role of `governance/duties/`?** Duties currently
  fire as code-review gates. In the closure-rule realization, each
  duty *is* a closure rule whose consequent writes a "duty
  discharged" cell. The substrate then refuses to dispatch a power
  whose duty is undischarged.

## Relation to the current ADR

The current ADR
[`work-dispatch-readiness-as-bilattice-valued-section`](../../governance/decisions/work-dispatch-readiness-as-bilattice-valued-section.md)
explicitly does not bind the migration; it commits to the *schema*
the closure-rule realization needs, but leaves the
realization-as-closure-rule open. This question is the placeholder.

## Adjacent reference

- `predication.store_closure.dispatch_eligibility_rule` — the
  existing realization of `dispatch-as-closure-rule-system`. Models
  the eligibility rule as a closure rule with twist-product fusion
  antecedents.
- The corpus's `closure-rule-language` and `closure-rule-system`
  theories — the language-side definition.
- The corpus's `dispatch-readiness-regime-is-strict` theorem — the
  closure-ordinal bound that makes this tractable.
