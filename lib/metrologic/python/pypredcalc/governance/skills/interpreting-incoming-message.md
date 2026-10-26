---
name: "Interpreting incoming message"
description: "Classifies an incoming message as task / question / FYI / intent / escalation / noise. Use on every incoming message before any other processing."
---

# Interpreting incoming message

## Requirements

- XO office.
- An incoming message: an inbox file, a captain message, a corpus-tracker signal, or any
  content delivered to the XO's intake.

## Steps

1. Read the message in full.
2. Classify per these categories:
   - **task**: a concrete request to do work. Has a clear acceptance criterion.
   - **question**: a request for information; no work to do, but a written answer is owed.
   - **FYI**: information for awareness, no action required. Acknowledge with a witness;
     don't queue work.
   - **intent**: the captain is expressing an intent that should be queued for future
     dispatch (not yet a task).
   - **escalation**: an item that requires steward or captain attention, not the XO's.
   - **noise**: spurious; archive with a witness, don't drop silently.
3. File a classification witness per `witness-every-classification`:
   - For task → create a task record and queue.
   - For question → file a question record under `work/questions/`.
   - For FYI → annotate with `classification: FYI` and archive.
   - For intent → queue an intent record.
   - For escalation → file a triage note for the steward.
   - For noise → file a triage note marked `requires-action: archive`.

## Outcomes

The incoming message is classified and witnessed. No silent drops; downstream processing
is keyed to the classification.
