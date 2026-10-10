# csl-json-services-section

CSL-JSON (`csl-data.json`, CSL 1.0.2) — the Citation Style Language's
bibliographic record format — as the org's one citation record format.

## Why it seats here

CSL-JSON is a record format profiled over JSON: data "pre-wire, pre-file".
Under the org-layering ruling of 2026-09-04, such a format "gets its own
engineering section under computer-data beside the format it profiles
(CloudEvents beside JSON Schema under json-services-section)" — so this
section sits in `json-services-section/services/` next to
`cloudevents-services-section` and `json-schema-services-section`, the
precedent that ruling names.

It seats here rather than under `computer-knowledge-systems-services-section`
because computer-data is upstream of computer-systems: a knowledge system
(bibliography, scholarly retrieval, a citation renderer) consumes this
codec, and must not grow its own copy. Two such copies existed before this
section — `bibliography-engineering-services-section/src/csl-json.mjs` and
`scholarly-literature-services-section/src/scholarly-literature.mjs`, each
with its own CSL type vocabulary, its own name constructor, and its own
date builder. They are gone; this is the one.

## What lives here

- `src/csl-json.mjs` — the algebra.
  - **Vocabulary**: `CSL_TYPES` (the complete CSL 1.0.2 item type list),
    `isCslType`, and `toCslType(rawType, aliases)`, which resolves a
    source's own type word through that source's alias table *first*, so
    OpenAlex's `"article"` (meaning a journal article) reads as OpenAlex
    means it rather than as the CSL type that happens to share its
    spelling; an unaliased word that is already a CSL type passes through,
    and anything else falls back to `"document"`.
  - **Names**: `cslName({literal, family, given})` builds a name from
    already-separated parts; `nameFromString` parses a display string
    ("Family, Given", institutional phrases, single tokens);
    `nameToString` is its inverse; `cslNames` lifts a heterogeneous list;
    `isValidCslName` is the predicate.
  - **Dates**: `cslDate(year, month?, day?)` is the constructor; the
    parsers `cslDateFromIsoString`, `cslDateFromPubmedString`, and
    `cslDateFromDateParts` build on it; `issuedYear` reads one back.
  - **Identity**: `bareDoi` strips whatever prefix a DOI arrived with;
    `normalizeTitle` folds a title (NFKD, diacritics dropped, lowercased,
    non-alphanumeric runs collapsed) to the one comparison form the whole
    house uses, so reference reconciliation, CrossRef verification, and
    screening dedup all mean the same thing by "same title".
  - **Admission**: `recognizeCslItem` / `admitCslItem` against the subset
    of the csl-data contract the house needs downstream (an `id`, a
    `title`, an `issued` year, and at least one named author or editor),
    tolerating CSL's open vocabulary of further fields.
  - `cslString` and `stripUndefinedCslFields` are the two coercions the
    projections share.
- `src/csl-record-formatting.mjs` — citation labels, reference-entry HTML,
  schema.org citation projection, house-record/CSL projection, and citekey
  minting. Markdown and bibliography consume these functions rather than
  carrying renderers or a second CSL adapter.
- `src/csl-projection.mjs` — `projectCslItem(record, projection)`: any
  source record to a CSL-JSON item by a *CSL projection*, data admitted
  against `src/csl-projection.schema.json` that names, per CSL variable, the
  path it is read from and the CSL value kind it becomes (text, title, names,
  date, year, doi, type with the source's own alias table, or a joined list),
  with constants, `{path}` templates and first-of fallbacks. A new
  bibliographic source is a projection, not a script.
- `scripts/project-openalex-work-csl.mjs`,
  `scripts/project-pubmed-summary-csl.mjs`,
  `scripts/project-crossref-work-csl.mjs` — one bibliographic source's
  native record shape to a CSL-JSON item, each also runnable as a filter
  (record JSON on stdin, CSL-JSON item on stdout). Each carries only its
  own source's type alias table; the mapping rules are the shared algebra
  above.

The network clients that *fetch* those records are not here — retrieving a
work from OpenAlex, PubMed, or CrossRef is knowledge-system work and lives
in `bibliography-engineering-services-section/scripts/`. This section only
knows the formats.

## Fixtures

`test/fixtures/` holds real recorded API responses (an OpenAlex `/works`
record, a PubMed `esummary` body, a CrossRef `/works/{doi}` body), so the
projections are checked against production shapes rather than hand-written
stand-ins.
