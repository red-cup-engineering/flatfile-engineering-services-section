---
name: "Writing decision records"
description: "Produces an ADR in the What / Why / Rules-out / Does-not-constrain pattern. Use when a binding choice is settled and needs to be recorded as governance."
---

# Writing decision records

## Requirements

- Records-officer office.
- A clear settled decision (not a draft proposal — drafts are `status: draft`; committed
  decisions are `status: committed`).

## Steps

1. Run `consulting-predication-categories-corpus` to ground the decision in corpus
   structure where applicable.
2. Write the file at `governance/decisions/<slug>.md` with frontmatter:
   - `type: decision`
   - `slug: <slug>` (matches filename)
   - `status: committed` (or `draft` if pre-ratification)
   - `date: <date>`
   - `theory-basis: [<slugs>]` — corpus atoms the decision draws on.
   - `hard-core: <commitment>` if the decision is a derivation from C1–C4.
3. Body in four sections, in order:
   - **What** — the decision in concrete terms.
   - **Why** — the forces / reasons / theory grounding.
   - **Rules out** — what this decision forbids going forward.
   - **Does not constrain** — what remains open after this decision.
4. If the decision touches hard-core C, mark `status: draft` until steward+captain
   ratification per `presiding-over-novation`.
5. Add the decision slug to `governance/decisions/_index.md`.

## Outcomes

A new decision record under `governance/decisions/`. Future work bound by it; supersession
requires another ADR.
