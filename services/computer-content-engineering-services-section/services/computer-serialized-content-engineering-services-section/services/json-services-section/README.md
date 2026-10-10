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

RFC 6902 JSON Patch application, applicability checking and deterministic patch creation are direct functions in `scripts/json-patch.mjs`, exported as `./json-patch`. `applyJsonPatch({value,patch})` returns `{present:true,value}` or `{present:false}` for document removal. Its six operations use the same RFC 6901 parser as pointer lookup and schema references; patch paths use string pointers, not URI fragments. Own keys such as `__proto__` remain ordinary JSON data. All edits happen on a private copy; a failed sequence never edits the supplied input. `checkJsonPatch` reports a bounded operation index and rule for an inapplicable patch. `createJsonPatch({before,after})` returns an RFC patch using object keys and positional array edits; it does not promise the smallest patch.

Paid transformations accept at most 64 KiB canonical request/result JSON, 128 patch operations, 8,192 nodes, 4,096 array elements and physical nesting depth 64. Non-finite numbers, invalid Unicode, non-JSON values and resource-limit excess are refused. The HTTP services transform supplied data only; they do not PATCH a remote resource or database.
