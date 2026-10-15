---
title: Retained custody through the one-time native cutover
type: specification
date-created: 2026-10-14
owner: semiotic-eavt-services-section
status: source-qualified; immutable provider and retained-host receiving required
---

# Retained custody through the one-time native cutover

This bounds the temporary, never-merge conversion branch's current operation.
It refines the historical design in `store-conversion.md` for the requirement to
preserve acknowledged work and queued messages. The earlier document remains
historical design evidence; its proposed original-store deletion is not performed
by this cutover. Whole original and failed candidate trees remain retained.

## Inputs and receiving

The conversion caller selects actual original readers and actual current writers.
The native first-cutover wrapper admits only existing immutable Guix providers,
a private same-volume operation directory, and a caller-held stopped-writer
condition. Local module tests do not discharge those conditions. Every source
snapshot must still match before binding. New durable state writes or advancement
of ready/claimed pending custody block rollback of the whole cohort.

The original ActivityPub queue stays in place. Conversion checks its actual bytes
against the current transport, never activates a delivery, never treats an
unadmitted message as received, and never turns an unresolved claimed or archived
pending outcome into permission to replay. Operation journals record recovery of
actual renames; they are not deployment certificates or authorization receipts.

## ActivityPub follower history

The original ActivityPub follower reader folds every row of its followers category:
exact held charge adds a follower, and every non-held charge removes that follower.
The current record carries `following:true` or `following:false` accordingly. This
is that carrier's established interpretation, not a general rule about denial.

The original query deduplicates verified witness identities, lists canonical dated
segments in date order, preserves byte-offset order within each selected category,
then orders by `String(recordedAt).localeCompare`, retaining source order at ties.
The temporary converter preserves the original `at` string and gives each distinct
follower witness a nonnegative safe-integer `sourceOrder` in selected stream order.
Repeated witness IDs do not receive another ordinal; distinct witnesses with equal
semantic record identity retain distinct native history. The original witness
parser must verify identity before deduplication. Missing or forged identities
refuse conversion.

The paired current ActivityPub reader uses the original timestamp comparison, then
`sourceOrder` at an equal timestamp. Canonical native ISO timestamps keep their
existing chronological order. Accepted original offset/case spellings are retained
without invented instants. Malformed ordinals and conflicting same-recipient,
same-timestamp, same-ordinal records refuse reading. Independent recipient histories
can reuse an ordinal. Current writes made after the stopped-writer cutover omit
`sourceOrder` and follow imported history at an equal instant. Existing equal-time
native-to-native ordering remains unchanged and is not claimed to be repaired.

The converter and this current reader are one source-composition contribution.
They must be selected together before activating the converted history. The normal
runtime gains no old reader or migration receipt.

## Work Arena domain identity and custody identity

A work move's semantic `id`, response `thread`, law `edition`, cross-thread relations,
and external evidence locators are domain content. They are not journal-witness
addresses merely because their spelling is an NI URI. The conversion preserves the
complete move content exactly, matching the native Work Arena writer. It translates
only the original observation's separately typed witness causes into native custody
addresses. A missing real witness cause still produces a cutover-blocking reference
disposition.

The native thread head is named from `record.thread ?? record.id`, using the current
store's `threadName` for a canonical NI identifier. The storage address of an opening
is never substituted for its semantic thread identity. A historical move with no
explicit semantic thread identity remains unqualified rather than gaining an
invented head. A response received before its opening retains its semantic thread
and the current arena's existing awaiting behavior.

Every move without a genuine causal edge remains in the head frontier. Only explicit
translated causes can consume existing frontier entries; the converter does not
invent an edge from timestamps or shared thread names. Receiving walks each named
head, counts distinct rows belonging to that semantic thread, follows typed cross-kind
causes without counting them as thread rows, and refuses missing or truncated walks.
The actual current Work Arena reader must reproduce the original board relationship,
including opening-only work, answers, promises, and cross-thread relations.

## Qualification boundary

Owner tests use complete genuine original writers/readers and current consumers on
disposable custody. They cover source bytes, order, duplicate/replayed identities,
refusal paths and named-head receiving. They do not prove an unidentified original
host artifact, arbitrary coexisting historical roots, the complete native Guix
construction, service quiescence, live migration, network delivery or activation.
Unknown historical kinds remain preserved in original custody, without a claim that
every historical application interpretation is available in the current runtime.
