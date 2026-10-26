---
name: "Consulting predication-categories corpus"
description: "Reads the corpus to ground a record's structuration. Use before encoding any new governance or work record per consult-corpus-before-encoding."
---

# Consulting predication-categories corpus

## Requirements

- Records-officer office.
- Read access to `theories/.../predication-categories/`.

## Steps

1. Identify the concept being recorded. What does the record encode — a decision about a
   morphism's behaviour? An office's responsibility? A specification of an output shape?
2. Use `pyfars context <slug>` and `pyfars search` to find related corpus atoms.
3. Read the corpus markdown for the closest atom(s). Note:
   - Frontmatter shape — does the corpus suggest specific fields the record should carry?
   - `depends-on:` — does the corpus record's dependency graph imply structure for this
     record?
   - Theorem proofs — does any proof load-bear on the way the concept is recorded?
4. If the corpus reveals a more theoretically-precise schema than the record's first draft
   uses, update the draft *before* writing.
5. Add `theory-basis:` field to the record's frontmatter naming the corpus atoms consulted.

## Outcomes

The record is grounded in the corpus. Its `theory-basis:` field names the corpus atoms it
draws on. Subsequent corpus updates that affect those atoms can be detected via the
audit-tool's reverse-link query.
