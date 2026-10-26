---
name: "Rendering mkdocs"
description: "Invokes mkdocs build --strict and surfaces any warnings as broken-doc-state. Use after writing prose, before release."
---

# Rendering mkdocs

## Requirements

- Docs-officer office.
- mkdocs installed; `mkdocs.yml` configured.

## Steps

1. Run `mkdocs build --strict`.
2. Capture warnings/errors:
   - Broken cross-references.
   - Missing pages referenced in nav.
   - Malformed markdown.
   - Missing or invalid frontmatter on prose documents.
3. If clean, the docs gate is open.
4. If dirty, fix the cited issues. Common fixes:
   - Add missing nav entries to `mkdocs.yml`.
   - Fix broken `[link](slug.md)` references.
   - Quote special chars in frontmatter.

## Outcomes

A clean strict-build of the documentation site. CI runs this gate on every commit
touching `docs/` or `prose/`; release blocks on it.
