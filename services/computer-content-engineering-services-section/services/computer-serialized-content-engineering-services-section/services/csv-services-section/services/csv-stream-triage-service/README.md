# CSV stream triage

Streams one large CSV, keeps the rows a spec asks for, and writes a dated triage record. It is generic: the spec is a data record, so a new source is a new record, not a new script.

Marks: **Observed** = run or read; **Inferred**; **Untested**.

## Use

```sh
node scripts/triage-csv.mjs --spec path/to/spec.json [--file local.csv] [--out record.json]
```

With no `--file` the spec's `source.url` is fetched and streamed; it is never held whole. No credential is read or sent. The spec shape is `data/records/schema/triage-spec.schema.json`:

- `filters`: exact matches on named columns (`equals`, `in`, `notEmpty`). Nothing is interpreted as code.
- `deadline`: a column that must hold an ISO 8601 time with an offset, later than the run time. Empty and unparseable values are counted and dropped, not guessed.
- `keep`: the only columns that leave the file. Everything else (contact columns, long descriptions) is dropped.
- `limit`: how many soonest-deadline matches to list. The counts always cover all matches.

The record carries `counts` (scanned, matchedFilters, matched, noDeadline, unparseableDeadline, pastDeadline, malformedRows), the source's `lastModified` and `contentLength` when fetched, and `generatedAt`. A spec naming a column the file lacks is refused, so a renamed column cannot silently match nothing.

## What was checked

- 10 tests pass (Observed, `node --test`, run from copies outside any checkout): chunk boundaries anywhere (including inside a quote pair, a UTF-8 character, or between CR and LF), ragged rows, filters, deadline offsets, counts, and that unlisted columns never appear in output.
- Parser speed on a synthetic 100 MB file of 48-column rows with long quoted descriptions: about 0.5 s and 81 MB RSS growth (Observed, one run). The real file's runtime is Untested.
- The existing `csv-services-section` codec decodes whole text; this package exists because a 213 MB file should not be.

## Not here

- The SAM.gov spec and its filter values are data owned by whoever uses them: `coesite-operations`, `contract-pursuit-services-section/data/records/triage-specs/sam-gov-it-notices.json`. That spec was admitted by this package's `admitTriageSpec` and checked against the real extract's 47-column header read on 2026-10-08 (Observed). It has not been run against the full file (Untested): run it on the machine meant for large public-data work, not on a small laptop.
- Triage says which notices are open and match. It does not say the seller is eligible. Set-aside, registration and past-performance terms are for a person to read in each notice.
