---
title: "Create office"
type: jural-relation
kind: power
slug: create-office
active-holder: pypredcalc-steward
passive-party: pypredcalc-community
scope-action: create-office-record
scope: governance/offices/
correlate-of: liability
theory-basis: [office-as-double-settlement, normative-operational-layering, jural-relation]
---

# Create office

The steward may add a new office to the operative structure O — a new role with action-domain,
deontic profile, and provided skills. Creating an office is the first step; populating it
with an incumbent requires [`install-personnel`](install-personnel.md).

## Scope

`governance/offices/<slug>.md` records.

## What this admits

The substrate gains a new office record at `pypredcalc-<slug>`. The office holds the powers
listed in its `action-domain:`; those powers' `active-holder:` cells reference the office's
slug. Installation of personnel later settles incumbency.
