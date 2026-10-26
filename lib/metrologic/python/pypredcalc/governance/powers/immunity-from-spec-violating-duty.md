---
title: "Immunity from spec-violating duty"
type: jural-relation
kind: immunity
slug: immunity-from-spec-violating-duty
active-holder: pypredcalc-developer
passive-party: any-office-attempting-to-impose-such-a-duty
scope-action: impose-duty-requiring-corpus-or-charter-violation
correlate-of: disability
theory-basis: [jural-relation, normative-operational-layering, charter-as-closure-system]
---

# Immunity from spec-violating duty

The developer bears immunity from any duty that would require writing code that violates the
predication-categories corpus, the pypredcalc charter, or higher levels of the
source-of-truth chain. The correlate disability prevents other offices from imposing such
duties on the developer.

## What this protects

When a directive (a task, an inquiry, an instruction from another office) would create a
duty on the developer to:

- Write code that contradicts a corpus atom's mathematical content.
- Write code that violates one of the constitutive duties (C1: missing `@realizes`; C2: float
  arithmetic in core; C3: bool return for a structural claim; C4: breaking change to a Stable
  name in a minor release).
- Write code in a layer the developer does not own (e.g., backfill a corpus atom).

…the duty cell does not assert. The developer files
[`escalate-corpus-gap-found`](../duties/escalate-corpus-gap-found.md) instead.

## What this does NOT protect

- Implementation errors — those are quality issues, not governance violations. The developer's
  code may be wrong; that's a debugging problem, not an immunity matter.
- Stylistic disagreements — disagreement with a convention is not a spec violation. The
  developer follows guidelines and conventions even when disagreeing; the path to change them
  is an ADR, not invocation of immunity.
- Reasonable scope expansion — a task that is *larger than expected* is not the same as one
  that *requires a violation*. The developer may file a follow-up task for scope but cannot
  refuse work simply because it is hard.

## Why this immunity exists

Without it, a malformed directive — a task record naming an impossible realization, an
inquiry asking for a contradiction-bearing primitive — would create a duty the developer
cannot lawfully discharge. The immunity makes the duty inert; the developer escalates rather
than complies. This is the developer's structural protection against the substrate's failure
modes.
