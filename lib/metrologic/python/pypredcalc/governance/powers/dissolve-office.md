---
title: "Dissolve office"
type: jural-relation
kind: power
slug: dissolve-office
active-holder: pypredcalc-steward
passive-party: pypredcalc-community
scope-action: terminate-office-record
scope: governance/offices/
correlate-of: liability
theory-basis: [office-as-double-settlement, normative-operational-layering, jural-relation]
---

# Dissolve office

The steward may remove an office from operative structure O. Dissolving an office terminates
its action-domain — the powers listed in its `action-domain:` lose their `active-holder:`
binding and become unheld until reassigned.

## Preconditions

- Personnel currently installed in the office must first be revoked via
  [`revoke-installation`](revoke-installation.md).
- Tasks currently assigned to the office must be either completed, reassigned, or cancelled
  by the executive-officer before dissolution.

## Scope

`governance/offices/<slug>.md` records — marks the office as `status: dissolved` and updates
the parent index. The file is not deleted; dissolution is a status transition that preserves
the historical record.
