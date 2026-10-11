# Flatfile services section

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
