---
title: "Surface friction as governance revision"
type: jural-relation
kind: duty
slug: surface-friction-as-governance-revision
active-holder: any-pypredcalc-office
passive-party: pypredcalc-community
scope-action: respond-to-governance-misfit
triggering-powers: any-power
required-action: file-revision-intent-rather-than-work-around
enforcement: substrate-violation
rule-type: N→N
theory-basis: [normative-operational-layering, jural-relation, recurrent-practice]
---

# Surface friction as governance revision

Any office operating under recently-authored governance — where powers misfit the actual
work, duties misfire on irrelevant cases, or skills miss steps — MUST surface that friction
as a revision intent rather than work around it.

This duty closes the governance ↔ execution loop: governance updates downstream when execution
shows it doesn't fit, instead of execution accumulating private workarounds that diverge from
the governance.

## What counts as friction

- A power's `triggering-powers:` doesn't match the duty that fires in practice (the duty
  fires under more or fewer powers than listed).
- A skill's steps don't match what actually has to be done (steps missing, steps in wrong
  order, steps that require capabilities the office doesn't have).
- A duty's `required-action:` is impossible or unhelpful in the actual case.
- An office's `action-domain:` is missing a power the office routinely needs to exercise.
- Two offices have overlapping power without clarity about who exercises it when.

## Required action

When friction is encountered:

1. Continue the immediate work using the closest workable interpretation (do not deadlock
   on imperfect governance — fail-forward).
2. File a revision-intent triage note in `work/inbox/` describing:
   - Which governance record(s) need revision.
   - What the friction was (specific case, what the record said, what was actually done).
   - A proposed amendment if obvious.
3. Tag the triage note `requires-action: governance-revision` so the XO routes it to the
   records-officer.

## Why this duty applies broadly

Listed `active-holder: any-pypredcalc-office` and `triggering-powers: any-power`. Any office
exercising any power can hit governance friction; all are obligated to surface it.

## Enforcement

Pre-substrate-automation: captain audits ongoing dispatch logs for "implicit workarounds"
in completion summaries. Workarounds without corresponding revision-intent triage notes are
duty-non-fulfillment.

Post-substrate-automation: friction signals can be tracked as a substrate metric (number of
revision-intent triage notes per release cycle). Releases with high friction and few
revisions filed indicate the duty is being shirked.
