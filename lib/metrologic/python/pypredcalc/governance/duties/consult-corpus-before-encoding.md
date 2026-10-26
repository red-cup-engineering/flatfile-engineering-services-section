---
title: "Consult corpus before encoding a new record"
type: jural-relation
kind: duty
slug: consult-corpus-before-encoding
active-holder: pypredcalc-records-officer
passive-party: pypredcalc-community
scope-action: encode-record
triggering-powers:
  - create-governance-record
  - modify-governance-record
  - create-work-record
  - modify-work-record
  - create-task-record
required-action: complete-corpus-consultation-loop
enforcement: substrate-violation
rule-type: N→N
theory-basis: [normative-operational-layering, jural-relation, recurrent-practice]
---

# Consult corpus before encoding a new record

Before encoding (writing to disk) any new pypredcalc governance or work record, the officer
MUST complete the following review loop. Skipping it is an unfulfilled duty — a substrate
violation governance machinery is entitled to flag.

## Required action: corpus-consultation review

Three steps, in order:

### 1. Read existing records

Survey records in the relevant area before writing. For governance: read `governance/`
(decisions, conventions, existing offices/powers/duties). For work: read `work/` in the
relevant area.

**Why**: New records often duplicate or contradict existing ones. This step prevents record
rot before it starts.

### 2. Study the predication-categories corpus

Look at the predication-categories corpus for how the CONCEPT being recorded is theorized.
The authoritative path:

```
theories/.../predication-categories/
  ├── concepts/
  ├── objects/
  ├── morphisms/
  └── theorems/
```

Use `pyfars context <slug>` and `pyfars search` to walk the graph. Key questions:
- Does the corpus name this concept? Does it give it a specific shape (frontmatter fields,
  relation types)?
- Can the record carry more theoretical precision than a prose note would suggest?
- Would the record benefit from `theory-basis:` links into the corpus?

**Why**: Records are substrate predications, not just notes. They should respect the
categorical structure of the corpus, not just pattern-match against prior records.

### 3. Improve structuration first, then encode

If steps 1–2 reveal a better schema, update the draft BEFORE writing. Do not write the
record planning to "fix it later" — once a record is committed and referenced, schema
changes become refactors.

## Theory grounding

This duty is a Type N→N rule: antecedent reads normative cells (the create / modify power
is held), consequent writes normative cells (this duty's `active-holder` cell is set),
which gates the operational record-creation event via an N→O rule.

## Privilege exceptions

None. All record creation is subject to this duty. (If a time-critical situation warrants
waiving the review, the captain can grant a one-time privilege record — but that privilege
record must itself be created following this duty, or its own creation is a substrate
violation.)
