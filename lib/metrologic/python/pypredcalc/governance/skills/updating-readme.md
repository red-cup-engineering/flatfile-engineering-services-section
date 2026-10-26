---
name: "Updating README"
description: "Edits README.md to reflect significant changes — new subpackages, new aggregates, hard-core C amendments. Use when the change is significant enough to surface to a first-time reader."
---

# Updating README

## Requirements

- Docs-officer office.
- A change significant enough that a new reader of pypredcalc benefits from seeing it on
  page 1.

## Steps

1. Read the current `README.md` end-to-end. Check whether existing content is still
   accurate.
2. For substantive new surface, add a one-paragraph mention with a cross-reference to the
   relevant `docs/<subpackage>.md` or `prose/narratives/<slug>.md`.
3. Keep the README short — it's a first-touch document, not a manual. The full prose
   lives in `docs/` and `prose/`.
4. If the change affects the quick-start example (e.g., a new aggregate makes the
   quick-start more direct), update the example.
5. Verify cross-references in the README still resolve.

## Outcomes

`README.md` reflects current pypredcalc state. A new reader gets oriented quickly without
reading stale content.
