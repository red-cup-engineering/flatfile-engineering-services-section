# JSON Lines

JSONL reads and writes one JSON value per nonblank line. Files use canonical JSON and a trailing newline. Parsing reports the original line number of malformed JSON.

The implementations live in `scripts/`; each exported function and its command line face take the same single JSON input and return one JSON result.

| Script | Input | Result |
| --- | --- | --- |
| `nonblank-lines.mjs` | Text string | Nonblank lines |
| `parse-jsonl.mjs` | Text string | JSON values |
| `serialize-jsonl.mjs` | JSON values | Canonical JSONL text |
| `read-jsonl.mjs` | File path string | JSON values |
| `write-jsonl.mjs` | `{path, records}` | Path, record count, byte count |
| `append-jsonl.mjs` | `{path, records}` | Path, record count, byte count |
| `is-jsonl-text.mjs` | Text string | Whether every nonblank line parses |
| `project-jsonl.mjs` | `{records, keys}` | Records containing selected keys |
| `commit-jsonl-records.mjs` | `{records, profile?}` | Canonical bytes, item digests, rolling digest, and Merkle root |
| `verify-jsonl-commitment.mjs` | `{records, commitment}` | Recomputed commitment verdict with first mismatch |

Run `node scripts/parse-jsonl.mjs` and supply the JSON string `"{\"name\":\"Ada\"}\n"` on stdin; it returns `[{"name":"Ada"}]`.

[EAVT](services/eavt-services-section/) specializes these values into entity–attribute–value–time evidence. Its [Datom](services/eavt-services-section/services/datom-services-section/) capabilities add settled readings or explicit assert/retract operations. [SEAVT](services/eavt-services-section/services/seavt-services-section/) separately admits semantic RMN coordinates.

`jsonl-jcs-sha256-sequence-v1` commits the order and content of any JSONL
sequence without assigning it event, clock, source, or semantic-record
meaning. EAVT journals may use that commitment as a consumer; their `e/a/v/t`
row law, custody feed, append trace, and witness time remain distinct.
