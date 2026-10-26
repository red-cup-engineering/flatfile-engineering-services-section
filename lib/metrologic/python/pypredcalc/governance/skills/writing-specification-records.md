---
name: "Writing specification records"
description: "Produces a specification record binding module shape, API contract, output guarantee, or protocol detail. Use when a shape that future work must conform to needs to be settled."
---

# Writing specification records

## Requirements

- Records-officer office.
- A specification target whose shape should bind future work (a module's API contract, an
  output-shape guarantee, a slug-format rule, a release-process detail).

## Steps

1. Run `consulting-predication-categories-corpus` if the specification is corpus-shaped.
2. Distinguish specification from decision:
   - **Decision** — a trade-off settled at one moment in time.
   - **Specification** — a shape that future work must conform to.
   The specification is *how things must look*; the decision *justifies* the specification.
3. Write the file at `governance/specifications/<slug>.md` with frontmatter:
   - `type: specification`
   - `slug: <slug>`
   - `status: active` (or `draft`)
   - `version: "0.1"` — specifications carry versions because they may evolve.
   - `hard-core: <commitment>` if the specification derives from C1–C4.
4. Body sections (order is flexible; pick what the spec needs):
   - **Why this exists** — the context that made the spec necessary.
   - **The spec** — concrete contract / shape / rules.
   - **What's bound by this** — surface the spec covers.
   - **What's not bound** — surface the spec doesn't cover.
   - **Audit / enforcement** — how violations are detected.
5. Add the specification slug to `governance/specifications/_index.md`.

## Outcomes

A new specification record under `governance/specifications/`. Future records and code that
touch its surface must conform.
