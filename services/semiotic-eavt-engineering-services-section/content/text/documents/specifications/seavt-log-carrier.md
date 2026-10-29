---
title: "SEAVT log carrier, sealing and daily byte budgets"
description: "The compact carrier profile seavt-row-json-carrier/1 for SEAVT rows in day logs, default sealing of closed days, and the per-root daily byte budgets with their append-time guard."
date-created: 2026-10-17
type: specification
status: built (src/seavt-carrier.mjs, seavt-log.mjs, log-budget.mjs, volume.mjs, compact-logs.mjs)
owner: semiotic-eavt-services-section
basis:
  - "Leader, 2026-10-17: aggressively refactor code to use SCA, SEN, SEAVT, SHP and other data formats so that data is compressed and we take reasonable amounts of logs per day."
companions:
  - store.md (the day logs this carries rows in)
---

# SEAVT log carrier, sealing and daily byte budgets

## 1. The carrier profile `seavt-row-json-carrier/1`

A SEAVT row is `{e, a, v, t}`; e, a and v are closed SEN terms. SEN's bridge `jsonToTerm` wraps every JSON scalar as `["pair", ["mark", "\"sen.json.string\""], ["mark", "\"…\""]]`, so a row written as term spines is several times the JSON it denotes. The bridge is injective and `termToJson` inverts it, so a coordinate that is the bridge image of a JSON value is carried as that value.

A carried row is one JSON object in the day log of its feed:

| member | meaning |
|---|---|
| `at` | ISO 8601 UTC instant; files the row under its day (required, first) |
| `t` | the row's `t`; absent means `t` equals `at` |
| `ej` or `e` | entity: a JSON value to re-admit with `jsonToTerm`, or a full term spine |
| `aj` or `a` | attribute, likewise |
| `vj` or `v` | value, likewise |

**CAR-1.** Per coordinate exactly one of `xj` and `x` is present; any other member is refused.
**CAR-2.** A writer carries a coordinate as `xj` only when `jsonToTerm(termToJson(term))` is structurally equal to `term`, checked at write time. A term outside the image (a bare mark, an unsorted object spine, a lambda) keeps its full spine, byte for byte.
**CAR-3.** A reader accepts both forms in any mixture; the earlier form (spines with a `t` and no `at`, or `{at, e, a, v}` with spines); and the plain form other feeds write (`e`, `a`, `v` holding a non-array JSON value).
**CAR-4.** A row line is at most `SEAVT_ROW_BYTES_MAX` (1 MiB); a larger value is a record and the row names it by address.
**CAR-5.** Object keys are the bridge's: sorted by UTF-16 code unit. Serialization order of the line is not part of the row.
**CAR-6.** A new profile adds new member names; a reader refuses a member it does not know, so profiles never silently mix.

Judged by `test/compact-carrier.test.mjs`: 1,500 random JSON triples (nested, unicode, astral, lone surrogates, numbers across the double range, objects in arbitrary key order) re-admit term-equal after JSON serialization.

Interned attribute names and a per-segment dictionary were measured and not adopted: BGZF's deflate already stores repeated names at a few bits each, so a dictionary saves under 2 percent of stored bytes at the cost of a second read path.

## 2. Sealing by default

**SEAL-1.** The first append that creates a day's file seals every earlier open day of the feed (`sealLogs(root, type, {before: date})`), so a raw `.jsonl` of a closed day does not outlive the next day's first row. A failed seal does not fail the append; the next new day or an explicit `seal-seavt-logs` retries.
**SEAL-2.** `append(root, type, line, {seal: false})` opts out; `seal-seavt-logs` is the explicit step for writers that do not use `append`.
**SEAL-3.** Readers are continuous across segments, a sealing file and the open file, with cursors in uncompressed bytes. A line may be longer than one 64 KiB BGZF block; a block then ends inside it.
**SEAL-4.** A compressed block write must report its full byte length. A zero or positive short write refuses with `short-write` before publishing a segment or retiring the original day. The complete `.sealing` source remains readable for retry; cleanup of the private incomplete output is attempted. This custody rule also applies when one admitted row spans several blocks.

## 3. Budgets and the guard

A root's budget is `data/state/log-budget-state/budget.json`, tracked: `{profile: "seavt-log-budget/1", default: {budget, cap}, feeds: {<feed>: {budget, cap}}}`, bytes of uncompressed log per day. A feed is a `data/logs/<feed>-logs` directory name without the suffix. `budget` is what the feed should write in a day; `cap` is the hard limit of the day's open file. A missing file means 32 MiB and 128 MiB.

**BUD-1.** `seavt-volume ROOT` reports per feed per day rows, raw bytes, stored bytes and ratio, and the feeds by stored bytes.
**BUD-2.** `seavt-volume ROOT --check` exits 1 when a feed-day's raw bytes exceed its budget; with `--stale-days N`, also when an open raw day file is older than N days.
**BUD-3.** `seavt-volume ROOT --propose [--write]` derives a budget file from the busiest day of each feed plus a quarter.
**BUD-4.** A writer opts into the guard with `const guard = logGuard(root)` and `append(root, type, line, {guard})` (or `appendSeavtRow`). When the day's file would pass `cap`, the line is not written, `append` returns false, the guard prints one `log-cap:` line and writes `<date>.capped` beside the day's file; every later append of that feed-day is refused silently. The next day is a new allowance.

## 4. Conversion

`compact-seavt-logs [--remove] ROOT...` rewrites the day files of `data/logs/*-seavt-logs` (named `<date>.jsonl` or `<date>-admit-<kind>.jsonl`) as sealed compact segments. Every row is verified to read back term-equal, and the written segment is read back line for line, before the source is touched. Lines that are not rows are carried through byte for byte. A source is deleted only with `--remove`; otherwise it keeps a `.compacted` receipt (or, for `<date>.jsonl`, is renamed `<date>.jsonl.legacy` so readers do not count it twice). A row over the bound leaves its file untouched and exits 3.
