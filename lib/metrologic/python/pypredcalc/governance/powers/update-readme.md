---
title: "Update README"
type: jural-relation
kind: power
slug: update-readme
active-holder: pypredcalc-docs-officer
passive-party: pypredcalc-community
scope-action: edit-readme
scope: README.md
correlate-of: liability
enables-skills: [updating-readme]
theory-basis: [jural-relation, normative-operational-layering]
---

# Update README

The docs officer may edit `README.md`. The README is the project's top-level entry point
for any new reader (math researcher, downstream substrate maintainer, contributor). It
covers:

- What pypredcalc is (math floor for predicated-computing realizations).
- Hard-core C summary (one paragraph each on the four commitments).
- Subpackage overview (one line per subpackage with what it realizes).
- Quick-start example.
- Link to mkdocs site for full documentation.

## Coordination

README changes describing newly-Stable surface coordinate with the release officer's
[`write-changelog-entry`](write-changelog-entry.md). The docs-officer files an
ADR-request triage note for the records-officer when a README change implies a stability-
tier promotion.
