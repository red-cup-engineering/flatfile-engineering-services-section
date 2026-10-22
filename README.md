# Flatfile services section

<!-- 561-group-standards:badges:start -->
[![Red Cup Engineering](https://img.shields.io/badge/561%20Group-Red%20Cup%20Engineering-c0392b)](https://github.com/red-cup-engineering)
[![License: MIT](https://img.shields.io/badge/license-MIT-c0392b)](LICENSE)
[![Indigenous data: CARE](https://img.shields.io/badge/Indigenous%20data-CARE-4b6f44)](https://github.com/red-cup-engineering/.github/blob/main/GOVERNANCE.md)
[![Tips welcome](https://img.shields.io/badge/tips-welcome-d4a017)](https://github.com/561-group/.github/blob/main/TIPS.md)
<!-- 561-group-standards:badges:end -->

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
