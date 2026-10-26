---
title: "Queue intent"
type: jural-relation
kind: power
slug: queue-intent
active-holder: pypredcalc-executive-officer
passive-party: pypredcalc-community
scope-action: place-intent-in-substrate-queue
correlate-of: liability
duties: [witness-every-classification]
enables-skills: [interpreting-incoming-message, queuing-intents]
theory-basis: [normative-operational-layering, jural-relation, dispatch-readiness]
---

# Queue intent

The XO may place an intent in the substrate's heartbeat queue — an incoming intention
(captain message, inbox inquiry, corpus-tracker signal) classified for downstream processing
in a future heartbeat tick.

## Attached duties

- [`witness-every-classification`](../duties/witness-every-classification.md) — every queued
  intent carries a classification witness recording source, classification, and routing.

## Effect

A new intent record appears in the substrate's intent queue. The intent will be processed in
a subsequent heartbeat tick, either dispatched as a task or held pending further input.
