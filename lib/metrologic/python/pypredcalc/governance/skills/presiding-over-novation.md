---
name: "Presiding over novation"
description: "Produces a complete novation record on a hard-core amendment, including pre/post text, reason, captain ratification, and date. Use when amending C1–C4."
---

# Presiding over novation

## Requirements

- Steward office is the active holder of this skill.
- The amendment must be ratified by the captain (per
  `immunity-from-non-captain-c-amendment`).

## Steps

1. Read the current text of the commitment being amended in `governance/charter.md` rules
   tier.
2. Draft the post-amendment text. Be specific: which words change, what they mean differently.
3. Identify the reason: degeneration signal from corpus-tracker, captain decision, downstream
   consumer requirement, etc.
4. Solicit captain ratification. Without it, the amendment does not bind.
5. Create the novation record at `governance/decisions/novation-<slug>-<date>.md` with
   `type: novation` and the fields per `witness-hard-core-amendments`:
   `commitment-amended`, `pre-text`, `post-text`, `reason`, `ratified-by: emsenn`, `date`.
6. Update `governance/charter.md` rules tier with the post-amendment text.
7. Update `governance/enterprise.md` `hard-core:` field if the commitment slug changed.

## Outcomes

- A new file under `governance/decisions/` of `type: novation`.
- `governance/charter.md` rules tier reflects the amended commitment.
- `governance/enterprise.md` `hard-core:` field updated if needed.
