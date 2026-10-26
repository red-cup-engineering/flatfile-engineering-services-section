---
type: reference
class: engineering
status: current
title: "Canonical SEAVT logging and journal kernel"
---

## The canon

For JS/Node service and daemon code in this tree, the canonical logging and
journal-record path is:

- **`@red-cup-engineering/semantic-record-journal-service`**
  (`createSemanticRecordJournal`) — the call surface application code uses to
  record a semantic record: it mints the record's content identity, appends
  the addressed content, and appends strict SEAVT claims for it (category,
  content pointer, optional relation, independent support/refutation
  charge).
- **`@red-cup-engineering/witness-journal-log-service`** — the SEAVT kernel
  underneath it. This is the sole effectful membrane onto `node:fs` for the
  witness-journal family: date-partitioned, append-only JSONL feeds at
  `<root>/data/logs/YYYY/MM/DD/<feed>.jsonl`, one file per (feed, day).
  `semantic-record-journal-service` depends on it directly
  (`appendEntries`/`appendSeavt`/`readEntriesAtPath`/`readSeavtAtPath`) and
  does not reimplement any part of it.

A new service or daemon that needs to write log/journal records should call
`createSemanticRecordJournal({ root, objectKind })` and use its `record`,
`query`, and `claims` methods, rather than hand-rolling `fs.appendFile`,
writing bare `console.log`, wiring `@logtape/logtape` directly, or reaching
for one of the other kernels below.

## Why these two, and not the others

Four SEAVT/EAVT-shaped implementations exist in the tree. Only the pair
above is canonical for JS application/service logging; the other three are
not duplicates competing for the same job — each sits at a different layer
or in a different language, and each is declared below on those terms
rather than deprecated wholesale.

### FARE's kernel (`apps/fare/src/kernel/seavt.mjs`) — app-internal, allowed

FARE's `seavt()` is a thin SRN-atom-encoding wrapper: it hex-encodes
raw, not-necessarily-SRN-safe entity/attribute/value coordinates
(`encodeSrnAtom`/`decodeSrnAtom`) and then calls the installed
`@red-cup-engineering/witness-journal-entry-service`'s own `seavt()`
unchanged. Its own comment is explicit about this: "no local
reimplementation of SRN grammar, row shaping, or semantic content
identification." It exists because FARE's real (pre-encoding) coordinates
can contain characters the witness-journal SRN grammar forbids (`/`, `;`,
`_`), not because FARE disagrees with the canonical kernel. It is
app-internal to `apps/fare` and stays there.

### PyFARS's Python port of the kernel: gone

PyFARS carried `seavt.py`, a Python port of the same SRN-atom encoding kept
byte-for-byte compatible with the JavaScript encoder, because Python code
cannot import a Node package. PyFARS was dissolved on 2026-09-27: each of its
capabilities already had a JavaScript owner, so the encoding now has the one
implementation in the canonical kernel and no Python shadow remains.

### Plain `eavt.mjs` (`561-group-computer/posix-holography/src/eavt.mjs`) — OS-substrate tier, not migrated

This is not an app-layer logger at all: it is the durable file-append
primitive for `561-group-computer`, the from-scratch OS abstraction that
`principal.mjs` and other OS-layer modules sit on. It provides guarantees
`witness-journal-log-service` does not make: `appendEavt` is a single
`O_APPEND` write followed by `fsyncSync` before returning (durability +
write-atomicity, its own OP1/OP2), on-disk bytes are the one canonical JCS
form (OP4), and reads tolerate a torn final line from a crash mid-append
without throwing (OP3). `readEavt`/`settleEavt` also fold a full EAVT
presheaf to a sheaf via `@red-cup-engineering/metrologic/bilattice`'s
knowledge-join — a generic operation `witness-journal-log-service` has no
equivalent of, since its SEAVT rows carry semantic content identity instead.

Its live, non-legacy consumers are few — `561-group-computer`'s own
workspace `package.json`, `561-group-computer/principal/src/principal.mjs`,
and `public-computer-services-section`'s `aletheon-services-section/server/
world/store.mjs` (via the `eavt-append.mjs` default-export shim) — but
forcing them onto `witness-journal-log-service` would not be a like-for-like
cleanup: it would drop `fsync` durability and torn-line recovery from
OS-layer identity/state code, and it would point the OS substrate's storage
at an application-layer `@red-cup-engineering` journal package, inverting
the stack's actual dependency direction (apps sit on the OS layer, not the
reverse). This kernel is declared canonical *for its own layer*
(`561-group-computer`'s durable file substrate) rather than retired.

(A fifth, unrelated artifact shares the name: `typed-resource-catalog`'s
`.../restricting/library/eavt/scripts/eavt.mjs` is a pure row-algebra module
— `rowId`/`assertRow`/`dedupe`, no file I/O — that documents the EAVT
`{e,a,v,t}` row shape inside the typed-resource-catalog's restriction
hierarchy and composes with `posix-holography`'s read/write morphisms
rather than competing with them. It is not one of the four kernels this
document adjudicates.)

## What this doesn't cover

This declares the canonical *kernel and call surface*. It does not mandate
migrating every `console.log`, `@logtape/logtape` call site, or hand-rolled
`fs.appendFile` logger in the tree in one pass — that is tracked and worked
incrementally elsewhere. It also does not touch the retired
`@emsenn/rwil-rdf-services` package: as of 2026-08-27, no live (non-legacy,
non-archive) file in this tree imports it — every remaining reference lives
under a `legacy/`-tagged capture, a retired transcript/exchange archive, or
a content-addressed data store, so there is nothing to migrate there.
