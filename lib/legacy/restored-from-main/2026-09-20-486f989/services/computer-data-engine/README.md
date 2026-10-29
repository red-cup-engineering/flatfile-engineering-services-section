# Computer data engine

`@red-cup-engineering/computer-data-engine` declares JSON-Schema-backed data types, admits values through their declared parent intersections, and provides a small TypeScript binding for the same supported schema subset.

Declarations are immutable.
Admission returns the supplied value unchanged; it does not coerce, copy, default, or freeze it.

```js
import {
  Mark,
  MarkType,
  createTypeSystem,
  instantiate,
  specializeType,
} from "@red-cup-engineering/computer-data-engine";

const textMark = specializeType([MarkType], {
  id: "example.text-mark",
  name: "Text mark",
  description: "A Mark carrying text.",
  schema: {
    type: "object",
    properties: {
      value: { type: "string" },
    },
  },
});
if (!textMark.ok) throw new Error(textMark.refusal.message);

const accepted = instantiate(textMark.value, new Mark("hello"));
const rejected = instantiate(textMark.value, new Mark(1));
// accepted.ok is true and accepted.value is the same Mark instance.
// rejected.ok is false; rejected.refusal.issues describes the failed value schema.

const catalog = createTypeSystem([MarkType, textMark.value]);
```

`defineType` declares a root type; `specializeType(parents, definition)` adds a local JSON Schema predicate to every parent predicate.
`instantiate` and `admit` return an explicit success or refusal.
`createTypeSystem`, `getType`, `addType`, `replaceType`, `removeType`, `admitFromSystem`, and `inspectTypeRelations` operate on immutable catalogs with resolved, acyclic parent edges.

`MarkSchema`, `MarkType`, `Mark`, and `mark` provide the existing opaque Mark carrier.
The declaration domain is that exact Mark schema and standard JSON Schema intersection specialization.
Richer semantic models remain with their own owners.

`validateJsonSchema` and `compileJsonSchema` support Draft 7 and Draft 2020-12 documents.
`transformJsonSchemaToTypescript` and `FromJsonSchema` bind a conservative supported subset to TypeScript.
These bindings do not claim to realize a whole CCE or RMN calculus.

## The platform module and its subpaths

The engine is the computer-data platform module.
Every capability below lives here once, by subpath, and the one-operation packages that used to carry them are gone from the tree (their published versions remain in the registry for history only; the import gate refuses any new import of them).

| subpath | capability | exports |
|---|---|---|
| `.` | data types, admission, Result, statements, things, resources, wire messages, identifyContent | `defineType`, `specializeType`, `admit`, `identifyContent`, ... |
| `./identity` | RFC 6920 `ni:` URIs; RFC 8949 canonical CBOR and its `ni:`; RFC 8785 canonical JSON; NFC semiotic JSON | `makeNiUri`, `isNiUri`, `verifyNiUri`, `niUriDigest`, `parseNiUri`, `encodeCanonical`, `decodeCanonical`, `canonicalCborToNiUri`, `deriveCborNi`, `canonicalJson`, `canonicalizeJson`, `canonicalizeSemioticJson` |
| `./json` | JSON values, parse, canonical text, JSON lines, immutable values, exact bytes through JSON, JSON resource and projectors | `isJsonValue`, `requireJsonValue`, `parse`, `parseJson`, `canonical`, `parseLines`, `serializeLines`, `jsonResource`, `jsonProjector`, `immutableJsonValue`, `encodeJsonByteCarrier` |
| `./validation` | JSON Schema Draft 7 and 2020-12 validation by one interpretive evaluator (no code generation: runs on Node, browsers, and Cloudflare Workers; reproduces ajv's issue kinds, paths, keywords, messages and order, held by test/validation-differential.test.mts), compiled snapshot validators, request forms | `validateJsonSchema`, `compileJsonSchema`, `validateJson`, `validateJsonSchemaInstance` |
| `./contracts` | named JSON Schema contracts and explicit reference graphs, using the same standards evaluator | `schemaFrom`, `SchemaContractSchema`, `SchemaContract` |
| `./types`, `./mark` | the JSON Schema to TypeScript binding; the Mark carrier | `FromJsonSchema`, `Mark`, `MarkType` |

Folded on 2026-09-11 (0.10.0): ni-services-section, make-ni-uri-service, parse-ni-uri-service, cbor-codec-service, encode-cbor-service, decode-cbor-service, cbor-ni-service, derive-cbor-ni-service, canonical-json-service, canonicalize-json-service, canonicalize-semiotic-json-service, json-byte-carrier-service, immutable-json-value-service, json-codec-service, parse-json-service, validate-json-service, validate-json-schema-instance-service.
The engine's one dependency, typed-resource-classification-kernel-service, is the next fold.
File effects (JSON file readers, atomic JSON writes) are compositions of the file owner and `parse`, and are not carried here.
