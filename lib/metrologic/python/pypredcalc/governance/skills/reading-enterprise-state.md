---
name: "Reading enterprise state"
description: "Produces a snapshot of current C / Γ / O state for steward intake. Use when the steward needs operational awareness before deciding on an amendment, an office change, or responding to a degeneration signal."
---

# Reading enterprise state

## Requirements

- Read access to `pypredcalc/governance/`, `pypredcalc/work/`, and the most recent corpus-
  binding audit.

## Steps

1. **C — hard-core.** Read `governance/charter.md` rules tier; collect the four C
   commitments and any draft amendments under `governance/decisions/` with
   `status: draft, type: novation`.
2. **Γ — generative mechanism.** Read the most recent corpus-binding audit report in
   `work/audits/` (or run a fresh one if stale per
   `maintain-corpus-tracking-loop-integrity`). Collect:
   - Number of new corpus atoms since prior audit.
   - Number of new realizations.
   - Outstanding gaps.
   - Any degeneration signals in `work/inbox/`.
3. **O — operative structure.** Read `governance/offices/_index.md`. Collect:
   - Active offices.
   - Any pending office-creation/dissolution drafts.
   - Personnel installations (currently informal; substrate-driven later).
4. Produce a summary record in `work/audits/enterprise-state-<date>.md` with sections for
   C / Γ / O and a "items requiring decision" list.

## Outcomes

A dated enterprise-state snapshot the steward (and ultimately the captain) can read in one
pass. Summarises decisions pending steward attention.
