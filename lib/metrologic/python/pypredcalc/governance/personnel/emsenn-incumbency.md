---
title: "emsenn pypredcalc incumbency"
type: incumbency
slug: emsenn-incumbency
status: informal
personnel: "personnel:561-group:emsenn"
of-polity: "polity:561-group"
of-enterprise: "enterprise:pypredcalc"
holds-offices:
  - office:pypredcalc-steward
  - office:pypredcalc-executive-officer
  - office:pypredcalc-corpus-tracker
  - office:pypredcalc-corpus-reader
  - office:pypredcalc-developer
  - office:pypredcalc-test-author
  - office:pypredcalc-quality-officer
  - office:pypredcalc-records-officer
  - office:pypredcalc-release-officer
  - office:pypredcalc-docs-officer
  - office:pypredcalc-algebra-specialist
  - office:pypredcalc-predication-specialist
  - office:pypredcalc-combinatorics-specialist
  - office:pypredcalc-topology-specialist
  - office:pypredcalc-lattice-specialist
  - office:pypredcalc-sheaf-specialist
  - office:pypredcalc-dynamics-specialist
recognition-status: informal
induction-status: informal
formalization-deferred-to: "pyfars run pypredcalc/"
---

# emsenn pypredcalc incumbency

The captain (`emsenn`, recognized at the polity layer at
[`561/governance/personnel/emsenn.md`](../../../../../governance/personnel/emsenn.md))
holds every pypredcalc office informally. This record names the incumbency for the
pypredcalc-scope governance audit.

## What "informal" means here

The substrate does not yet carry incumbency cells (`recognized-as-incumbent-of`,
`inducted-into`) settled to `t` for any (emsenn, pypredcalc-office) pair. The captain
acts in each office's role as a practical matter — but the normative layer attributes
those exercises to the office only because the substrate has nothing to disagree with,
not because incumbency is positively settled.

When `pyfars run pypredcalc/` becomes operational, the steward (also held informally by
the captain) will exercise [`install-personnel`](../powers/install-personnel.md) for each
office separately. That settles both the recognition and induction predicates in the
substrate — *dignitas*, full incumbency, formal authority.

## Why the captain holds all offices

PyPredCalc is currently a one-person enterprise plus contracted inference sessions.
Inference sessions are **not personnel** — they are agents (records under
[`../agents/`](../agents/)) with operational scope but without the recognition relation
that makes personnel. The captain is the only personnel; therefore the captain holds
every office.

When additional personnel are added (a federated polity member, a contracted contributor
treated as personnel rather than as an inference session), they get their own
incumbency record here, and the steward exercises `install-personnel` to bind them to
the appropriate offices.

## Office-by-office breakdown

The captain's role in each office is summarized in the office record's "Incumbency"
section. This record is the cross-cutting view: one personnel, all the offices.

## Multiplicity in operational sessions

A single contracted inference session (e.g., a Claude Code session running pypredcalc
work) acts on the captain's behalf in whatever office the dispatch routes it to. The
session is the executing agent; the captain is the personnel whose incumbency authorizes
the session's actions. This is the agent / personnel distinction made explicit:

- **Personnel** (`emsenn`) — recognized member; authority-bearing.
- **Agent** (e.g., `pypredcalc-developer-agent`) — role-prompt; doer.
- **Inference session** — concrete instance of an agent, selected by substrate dispatch.

The chain: the captain (personnel) holds an office → the office's deontic profile names
its agents → the substrate selects an inference session for a dispatched task → the
session acts within the office's scope on the captain's authority.
