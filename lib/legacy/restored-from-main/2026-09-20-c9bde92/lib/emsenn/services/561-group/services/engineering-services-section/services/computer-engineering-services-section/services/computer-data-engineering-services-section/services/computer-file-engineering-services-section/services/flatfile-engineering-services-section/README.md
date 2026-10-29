# Flatfile engineering services section

The flatfile row of the posix-holography decomposition: the base byte
primitives for the flat (text) branch, ported to stand alone from
`@red-cup-engineering/computer`'s `posix-holography/src/{flatfile,read-text,sniff}.mjs`.

A flatfile is a NUL-free regular file. `src/flatfile.mjs` carries:

- `writeFlatfile(path, content)` -- whole-file atomic text write (temp
  + fsync + rename).
- `readFlatfileText(path)` -- UTF-8 whole-file text read.
- `sniffFileBinarity(path)` -- sniffs a regular file's leading bytes
  for a NUL, returning `"flat"` or `"binary"`.
- `classifyFlatfile(path)` -- the file -> regular-file -> flatfile
  spine, as a plain classification value (never the charged/holographic
  reading upstream's `stat.mjs` composes -- that reading belongs to the
  stat/observation row of the decomposition, not this one).

Zero dependencies beyond `node:fs` and `node:path`. One script per
effect under `scripts/`, composed into one CLI at `apps/flatfile-cli.mjs`.
The classification result shape is schema'd at
`data/records/schema/glossary/terms/flatfile.schema.json`, and
`content/text/documents/articles/teaching-articles/explanations/what-is-a-flatfile.md`
explains the spine in plain words.
