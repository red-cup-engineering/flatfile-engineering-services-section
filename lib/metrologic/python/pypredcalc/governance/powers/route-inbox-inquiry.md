---
title: "Route inbox inquiry"
type: jural-relation
kind: power
slug: route-inbox-inquiry
active-holder: pypredcalc-executive-officer
passive-party: pypredcalc-community
scope-action: classify-and-route-inbox-inquiry
scope: work/inbox/
correlate-of: liability
duties: [witness-every-classification, close-execution-loops]
enables-skills: [routing-inbox-inquiry, interpreting-incoming-message]
theory-basis: [normative-operational-layering, jural-relation, dispatch-readiness]
---

# Route inbox inquiry

The XO may classify an incoming inbox inquiry (a file under [`work/inbox/`](../../work/inbox/))
and route it to the appropriate office. Inbox inquiries originate from downstream consumers
(PyFARS, predicated-computing realizations) asking for new primitives or resolution of
ambiguities.

## Routing categories

| Inquiry pattern | Routes to | Outcome |
|---|---|---|
| Missing realization of a corpus atom | corpus-tracker → developer | Realization-gap task; developer writes the realization. |
| Question about an existing realization's contract | records-officer | Specification record clarifying the contract. |
| Bug report | developer | Bugfix task. |
| Architectural disagreement | steward | Triage note for captain review. |

## Attached duties

- [`witness-every-classification`](../duties/witness-every-classification.md) — inbox file's
  frontmatter `status:` flips from `open` to `routed`, with `routed-to:` set.
- [`close-execution-loops`](../duties/close-execution-loops.md) — once the routed work
  completes, the inbox file's `status:` flips to `answered` with an answer body.

## Effect

The inquiry's frontmatter is updated; one or more downstream task records may be created
that the XO subsequently dispatches via [`dispatch-task-to-office`](dispatch-task-to-office.md).
