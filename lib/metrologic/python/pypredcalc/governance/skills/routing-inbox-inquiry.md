---
name: "Routing inbox inquiry"
description: "Classifies an incoming inbox file and routes it to an office for response. Use when a new file appears in work/inbox/ with status: open."
---

# Routing inbox inquiry

## Requirements

- XO office.
- The inbox file under `work/inbox/<slug>.md` exists and has `status: open`.

## Steps

1. Read the inbox file's frontmatter and body.
2. Classify per the routing categories in
   [`route-inbox-inquiry`](../powers/route-inbox-inquiry.md):
   - Missing realization → corpus-tracker (file realization-gap task).
   - Question about an existing contract → records-officer (write specification or decision).
   - Bug report → developer (bugfix task).
   - Architectural disagreement → steward (triage note for captain review).
3. Update the inbox file's frontmatter:
   - `status: routed`
   - `routed-to: <office-slug>`
   - `routed-at: <date>`
4. Create the downstream task record(s) per the routing decision and dispatch via
   `dispatching-realization-task`.
5. When the downstream work completes, return to the inbox file and add an "Answer" section
   in the body, flip `status: answered`, and add `answered-at`.

## Outcomes

The inbox file is `routed` (with `routed-to` cell settled) and a downstream task is queued.
Eventually the file becomes `answered` with an answer body referencing the realization.
