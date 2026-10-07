# JSON Schema

The scripts admit the supported Draft 2020-12 vocabulary, validate JSON instances, resolve references against an explicit corpus, and preserve schemas as pointer-cell assertions. Each file in `scripts/` implements its named function with one JSON input and output. `src/index.mjs` collects exports.

| Effect | Script and input |
| --- | --- |
| Admit a schema and its identity | `admit-schema.mjs`: `{schema, id?, allowUnknownAnnotations?}` |
| Validate an instance | `validate-schema-instance.mjs`: `{instance, schema, schemas?}` |
| Resolve a reference | `resolve-schema-reference.mjs`: `{base, reference, schemas?}` |
| Unfold a schema into assertions | `unfold-schema.mjs`: `{schema, time, base?}` |
| Reconstruct a schema | `fold-schema-assertions.mjs`: `{assertions}` |
| Inspect conflicting assertions | `cohere-schema-assertions.mjs`: `{assertions}` |
| Inspect a corpus and its references | `inspect-schema-corpus.mjs`: `{schemas}` |
| Read a named schema | `read-schema.mjs`: `{pool, name}` |
| Write or amend a schema atomically | `write-schema.mjs`: `{pool, schema, amend?, dryRun?}` |
| Discover schemas under a path | `search-path-for-schema.mjs`: path string |
| Census artifacts within explicit limits | `json-schema-census.mjs`: `{root, maxBytes?, maxFiles?}` |

Reference resolution reads only the supplied corpus. Filesystem operations require an explicit path or pool. A write checks the resulting corpus before replacing a file; refusal leaves existing data intact. Census fails when its limits are exceeded instead of returning an apparently complete truncated result.

```sh
printf '%s\n' '{"instance":3,"schema":{"type":"integer"}}' | node scripts/validate-schema-instance.mjs
```

`apps/json-schema-cli.mjs` accepts successive validation requests as JSONL. The individual scripts accept one JSON value. Run `node --test test/*.test.mjs`.
