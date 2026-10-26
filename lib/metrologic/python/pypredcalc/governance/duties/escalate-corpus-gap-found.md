---
title: "Escalate corpus gap when found"
type: jural-relation
kind: duty
slug: escalate-corpus-gap-found
active-holder: pypredcalc-developer
passive-party: pypredcalc-community
scope-action: file-upstream-question
triggering-powers: [write-pypredcalc-source]
required-action: file-question-to-corpus-tracker-and-stop
enforcement: substrate-violation
rule-type: N→N
theory-basis: [normative-operational-layering, jural-relation, charter-as-closure-system]
---

# Escalate corpus gap when found

When the developer attempts a realization and finds the corpus is inconsistent, missing,
insufficient, or contradicts itself, the developer MUST stop and file a question upstream
rather than backfill the corpus from within the code layer.

## What counts as a corpus gap

- A corpus atom whose definition contradicts another atom it depends on.
- A corpus atom referenced by a theorem proof but not actually present in the corpus.
- A corpus atom whose markdown file says one thing but whose `theory-basis:` references
  imply another.
- A claimed-proved theorem whose proof sketch reveals a load-bearing gap.

What does NOT count as a corpus gap:

- The developer doesn't yet understand the atom — that's a learning task, not a corpus
  gap. Read more, ask the captain, ping the corpus-tracker.
- The atom is intentionally provisional (`status: draft`) — corpus-tracker filters those
  out of realization-gap tasks; if one slipped through, file a triage note for the
  corpus-tracker.
- The realization is hard but possible — that's a developer challenge, not an escalation
  trigger.

## Required action

When a corpus gap is found:

1. **Stop coding.** Do not invent a realization that "papers over" the gap.
2. File a question record under `work/questions/` describing:
   - Which corpus atom was being realized.
   - What the gap is (be specific: file paths, contradicting statements, missing
     dependencies).
   - What the developer would need from upstream to proceed.
3. Mark the realization-gap task as `status: stalled, blocker: corpus-gap-question-<slug>`.
4. Notify the XO via a triage note so the XO can either re-dispatch elsewhere or escalate
   to the steward / captain.

## Why this duty exists

The developer's [`immunity-from-spec-violating-duty`](../powers/immunity-from-spec-violating-duty.md)
protects against directives requiring corpus-violating code. This duty is the *positive*
correlate: when the developer encounters such a situation, they actively escalate rather
than silently bend the code.

## Enforcement

Code review during dispatch closure. The developer reporting "task complete" on a
realization that was actually realized via corpus-bypassing tricks (e.g., adding a code
helper that does what the corpus says is impossible) fails the corpus-binding audit's
realization-claim test.
