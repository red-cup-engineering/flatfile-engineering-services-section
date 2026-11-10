# @red-cup-engineering/flatfile-engineering-services-section

<!-- 561-group-standards:badges:start -->
[![Red Cup Engineering](https://img.shields.io/badge/561%20Group-Red%20Cup%20Engineering-c0392b)](https://github.com/red-cup-engineering)
[![License: MIT](https://img.shields.io/badge/license-MIT-c0392b)](LICENSE)
[![Indigenous data: CARE](https://img.shields.io/badge/Indigenous%20data-CARE-4b6f44)](https://github.com/red-cup-engineering/.github/blob/main/GOVERNANCE.md)
[![Tips welcome](https://img.shields.io/badge/tips-welcome-d4a017)](https://github.com/561-group/.github/blob/main/TIPS.md)
<!-- 561-group-standards:badges:end -->

Plain flatfile: whole-file atomic text write (temp + fsync + rename), synchronous UTF-8 whole-file text read (readFlatfileText), a binarity sniff over a regular file's leading bytes, and a plain classifier for the file -> regular-file -> flatfile spine. A flatfile is a NUL-free regular file -- the base byte-touch every text codec composes.

This section owns file data whose admitted carrier is a finite byte sequence in
one file. Its children prove progressively narrower representation families;
they do not infer format identity from a detached registry.

## Package surface

This section is also the package `@red-cup-engineering/flatfile-engineering-services-section`
(the revived `@red-cup-engineering/flatfile`): `src/flatfile.mjs` exports `writeFlatfile`,
`createFlatfile`, `ensureFlatfileDirectory`, the synchronous UTF-8 whole-file read
`readFlatfileText`, `sniffFileBinarity` and `classifyFlatfile`. The asynchronous
`readFileText` of `computer-file-engineering-services-section` remains for async callers;
`readFlatfileText` is for callers whose own contract is synchronous.


## File receipt store

`@red-cup-engineering/flatfile-engineering-services-section/file-receipt-store`
exports the existing `FileReceiptStore` for explicit caller-owned JSON receipt paths.
It preserves process/restart claims and write-lock fencing, not power-loss durability.
See `specifications/file-receipt-store.md` for source lineage and migration.

## Acceptance

Run `npm test` for the source suite. The [API reference](docs/API.md) links the source refusal and [runnable consumer example](examples/quickstart.test.mjs).
