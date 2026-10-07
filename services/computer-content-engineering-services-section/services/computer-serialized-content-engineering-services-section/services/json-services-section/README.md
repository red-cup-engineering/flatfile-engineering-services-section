# JSON

JSON value admission, canonical serialization, text and byte carriers, record-key projection, and CloudEvents are direct functions in `scripts/`. Each script exports its function and input/output schemas. Run it with one JSON value on stdin to receive one JSON value on stdout. `src/index.mjs` collects the function exports.

```sh
printf '%s\n' '{"z":2,"a":1}' | node scripts/canonical-json.mjs
# "{\"a\":1,\"z\":2}"
printf '%s\n' '{"record":{"name":"Ada","role":"engineer"},"keys":["name"]}' | node scripts/project-json-record-keys.mjs
# {"name":"Ada"}
```

| Capability | Location |
| --- | --- |
| Parse, admit, canonicalize, project JSON | `scripts/` |
| Validate instances, resolve local references, transform schema assertions | [JSON Schema](services/json-schema-services-section/) |
| Read and write sequences of JSON records | [JSONL](services/jsonl-services-section/) |
| Entity–attribute–value–time evidence and journals | [EAVT](services/jsonl-services-section/services/eavt-services-section/) |
| Explicit judgments and assert/retract facts | [Datom](services/jsonl-services-section/services/eavt-services-section/services/datom-services-section/) |
| Closed RMN semantic coordinates and semantic records | [SEAVT](services/jsonl-services-section/services/eavt-services-section/services/seavt-services-section/) |

Generic JSON admission accepts finite, acyclic values with dense arrays and plain records. RFC 8785 canonical serialization also refuses lone Unicode surrogates, sorts keys by UTF-16 code units, and preserves array order.

Byte carriers use `{mediaType, bytes}` with integer bytes from 0 through 255. Native `Buffer` and `Uint8Array` conversion belongs at the caller boundary. There is no build step; run `node --test test/*.test.mjs`.
