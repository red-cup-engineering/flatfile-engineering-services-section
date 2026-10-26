# Source-bound schema reference incidence

## Receiving scenario and ownership

The existing `schemaReferenceIncidence(contracts)` operation supplies the finite
reference graph used to inspect declared schema contracts. A resource lineage
scanner must distinguish a real schema edge from an example that merely contains
the text `$ref`, and must resolve a local edge against the schema resource that
declared it. This operation reads supplied declarations only. It does not fetch
schemas, validate instances, infer subtyping, or grant a repository mutation.

Metrologic retains its original incidence operation and result shape. The
already-declared JSON 0.4.0 supplier owns RFC 8785 admission/canonical identity
and RFC 6901 pointer lookup; no second JSON or pointer implementation is added.

## Guarantees

1. Inspect only schema-valued positions of the resource's declared Draft
   2020-12 or Draft 7 dialect. Undeclared roots default to 2020-12; embedded
   resource roots inherit unless they declare a supported dialect. A dialect
   declaration at a non-resource root refuses. `const`, `enum`, `default`,
   `examples`, and unrecognized extension annotations remain instance data.
   `definitions` retains the standard 2020-12 default-meta-schema alias for
   `$defs`. Legacy `dependencies`, `additionalItems`, and tuple `items` belong
   to Draft 7; `prefixItems`, `dependentSchemas`, `contentSchema`, `$defs`,
   and unevaluated keywords belong to 2020-12.
2. Preserve each reference's source contract, original spelling, and escaped
   JSON Pointer location. Keep the original result fields `from`, `ref`,
   `target`, `location`, `scope`, and `resolved`. `scope` retains its historical
   syntactic meaning: fragment-only and empty references are local; references
   naming a document are external even when that document is embedded locally.
3. An embedded `$id` changes the resource used by descendant references.
   Absolute URI resources resolve relative references with the host URL
   implementation. Historical bare house schema identities retain exact-name
   matching; this compatibility mode is not claimed as an absolute URI profile.
   Draft 7 plain-name fragment `$id` values declare anchors without replacing
   their containing resource. Undefined Draft 7 fragment-id forms and forbidden
   2020-12 nonempty `$id` fragments refuse instead of overwriting a resource.
4. Resolve pointer fragments through the original JSON provider. A boolean
   `false` schema is a present target. A property inherited from a JavaScript
   prototype is absent. The target must itself occupy a recognized schema
   position, not a scalar keyword or an instance-data annotation.
5. Resolve static `$anchor` targets and static `$ref` targets naming
   `$dynamicAnchor`. This finite operation does not evaluate `$dynamicRef`,
   dynamic scope, recursive validation, or custom schema vocabularies.
   Draft 7 `$ref` siblings cannot change the reference base or emit additional
   reference edges. Explicit JSON Pointers can still name schema-valued sibling
   storage, such as `#/definitions/X`; incidence checks that target's presence
   without interpreting the target as an instance validator.
6. External resources are available only through the source contract's explicit
   `references`. Their presence elsewhere in the top-level input does not make
   them an admitted dependency. Resolve actual target fragments; declaring an
   external root alone cannot make a missing fragment present.
7. Different schemas cannot silently share one declared resource or anchor
   address. Identical declarations may be reused. Duplicate top-level contract
   identities refuse. JSON admission refuses cycles/accessors without executing
   them, and all result arrays and records are frozen.
8. Output order is deterministic UTF-16 code-unit order, as used by the existing
   JSON canonicalizer. Locale collation is never consulted. Original identifier
   spelling is retained; Unicode normalization does not merge source identities.

## Environmental expectations and limits

Contracts provide a nonempty `id`, a finite JSON Schema object or boolean, and
an array of explicit referenced contracts. The operation runs synchronously
over already-collected data. The number and size of declarations remain the
caller's acquisition budget; this operation makes no global completeness or
unbounded-runtime claim. Unresolved incidence is evidence of an unreceived
reference in this supplied universe, not proof that a real-world file is unused.
Unsupported dialects refuse rather than receiving invented keyword semantics.
The scanner does not follow references to evaluate or activate a target's
keywords. A resolved row proves a received schema location, not successful
schema compilation or instance validation.

## Independent verification cases

The existing two cases retain bare-address recursion and explicit composition.
New requirement-derived cases exercise annotation isolation, all supported
schema positions, escaped and percent-encoded pointers, false schemas,
prototype names, scalar targets, nested resource scope, relative external
references, anchor scope, actual external fragment lookup, duplicate identity
refusal, inert source admission, canonical ordering, and original immutable
source preservation. These are native module tests against the actual selected
JSON source functions, not replacement mocks.

## Standards

- JSON Schema Core 2020-12, sections 4.3.5, 5, 8.2, 9.2.1 and 10:
  https://json-schema.org/draft/2020-12/json-schema-core
- JSON Schema Validation 2020-12, contentSchema and annotations:
  https://json-schema.org/draft/2020-12/json-schema-validation
- JSON Schema Draft 7 Core, sections 7 and 8:
  https://json-schema.org/draft-07/draft-handrews-json-schema-01
- JSON Schema Draft 7 Validation, sections 6, 8 and 9:
  https://json-schema.org/draft-07/draft-handrews-json-schema-validation-01
- RFC 6901, sections 3, 4 and 6: https://www.rfc-editor.org/rfc/rfc6901
- RFC 8785: https://www.rfc-editor.org/rfc/rfc8785

Source receiving, full-package qualification, immutable registry publication,
and installed downstream consumers remain separate receiving observations.
