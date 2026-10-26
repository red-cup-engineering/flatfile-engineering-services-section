---
name: "Writing prose document"
description: "Authors a prose document under docs/ or prose/ explaining a piece of public surface in math-reader terms. Use after substantive new surface ships."
---

# Writing prose document

## Requirements

- Docs-officer office.
- The realized surface to document.
- The corpus atom(s) the surface realizes.

## Steps

1. Determine the document type:
   - `docs/<subpackage>.md` — subpackage-level explanation; one per subpackage.
   - `prose/narratives/<slug>.md` — long-form (≈500–3000 words) narrative crossing several
     realizations.
   - `prose/remarks/<slug>.md` — short essay (≈100–600 words) attached to a single
     realization.
2. Frontmatter:
   - `type: prose-document`
   - `kind: subpackage-doc | narrative | remark`
   - `realizes-cited: [<corpus-slugs>]` — corpus atoms the document explains.
3. Body:
   - Open with a math-reader-accessible framing of what the surface *is*.
   - Worked example with reasonable inputs.
   - Cross-reference to the corpus markdown for the reader who wants the full math.
   - Cross-reference to docstrings for the reader who wants the API detail.
4. Run `mkdocs build --strict` (via [`rendering-mkdocs`](rendering-mkdocs.md)) to verify
   no broken links, no malformed markdown.
5. If the document warrants README mention (a major new surface, a new subpackage), run
   [`updating-readme`](updating-readme.md).

## Outcomes

A prose document under `docs/` or `prose/`. The mkdocs render is clean. New readers of
pypredcalc can find a math-reader-accessible explanation of the surface without reading
the source.
