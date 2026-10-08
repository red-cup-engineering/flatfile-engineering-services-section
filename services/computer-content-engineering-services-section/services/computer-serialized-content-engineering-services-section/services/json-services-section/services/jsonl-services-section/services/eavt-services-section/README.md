# EAVT

An EAVT witness is exactly `{e,a,v,t}`; each coordinate is a JSON value. Tuple spelling `[e,a,v,t]` is admitted by `normalize-row.mjs`. Operations live in `scripts/`; use their exported function or send one JSON input to the same file on stdin. The input/output schemas accompany the function.

| Work | Scripts |
| --- | --- |
| Admit and serialize witnesses | `admit-row`, `normalize-row`, `encode-row`, `decode-row` |
| Project current facts and contradictions | `current-facts`, `latest-attributes`, `read-contradictions` |
| Read and retain evidence | `fold-eavt-evidence`, `settle-eavt-evidence`, `section-eavt-evidence` |
| Follow citation proofs | `extract-eavt-citations`, `resolve-eavt-proof-tree`, `verify-eavt-proof-closure` |
| Read and append trace files | `read-eavt-trace`, `append-eavt-row` |
| Maintain dated journals | `journal-path`, `read-eavt-journal`, `append-eavt-entries`, `write-eavt-entries` |
| Read across independently custodied feeds | `list-feeds-at`, `read-all-feeds-entries`, `cross-feed-reading` |
| Project a time window and cell state | `situation-window`, `latest-state`, `read-eavt-state` |

Append-order trace, stored time, and computed judgments remain distinct. Historical canonical-CBOR NI identity remains available through `identify-content-addressed-row.mjs`; it differs from the canonical JSON line produced by `identify-row.mjs`. New trace writes are JSONL, and historical trace readers retain legacy decoding.

The relation web (`src/relation-web.mjs`, export `./relation-web`, called DREW) is the same fact log over relations: an observation batch admits `{subject, predicate, object}` relations over plain JSON terms from one source, content-addresses the batch, and keeps each relation occurrence with its source and ordinal; `query` and `graph` project it. It reads no Sign cell, valuation or FOUR, so the protocol codecs (Micropub, Microsub, IndieAuth, Webmention) and the flatfile provider record observations here, and SignGraph's predicate-algebra modeling (`pam`) builds over it.

[Datom](services/datom-services-section/) adds explicit judgments or assert/retract facts. [SEAVT](services/seavt-services-section/) requires closed RMN semantic coordinates and has its own admission and semantic-record operations. Arbitrary EAVT strings do not become SEAVT merely because they occupy the same four positions.

```sh
printf '%s\n' '["subject","attribute",3,1]' | node scripts/normalize-row.mjs
# {"e":"subject","a":"attribute","v":3,"t":1}
```

Run `node --test test/*.test.mjs` for the core and recovery behavior.
