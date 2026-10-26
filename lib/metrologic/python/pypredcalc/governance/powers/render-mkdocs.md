---
title: "Render mkdocs"
type: jural-relation
kind: power
slug: render-mkdocs
active-holder: pypredcalc-docs-officer
passive-party: pypredcalc-community
scope-action: invoke-mkdocs-build
correlate-of: liability
enables-skills: [rendering-mkdocs]
theory-basis: [jural-relation, normative-operational-layering]
---

# Render mkdocs

The docs officer may invoke `mkdocs build --strict` to render the documentation site.
Strict mode fails on any warning — broken cross-reference, missing nav entry, malformed
markdown — so a clean strict build is the gate for "documentation is consistent with what
ships."

## Effect

A rendered site under `site/` (gitignored) reflecting the current docs source. CI runs
the strict-build gate; failures block release.
