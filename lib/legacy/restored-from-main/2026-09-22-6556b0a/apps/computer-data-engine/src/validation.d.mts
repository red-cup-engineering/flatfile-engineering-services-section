/**
 * JSON Schema evaluation: the one evaluator every admission in the house
 * goes through (defineType/admit, typed operations, web-application request
 * validation, MCP tool arguments).
 *
 * The evaluator interprets the schema graph; it generates no code, so it
 * runs unchanged on Node, in a browser, and on runtimes that forbid dynamic
 * code generation (Cloudflare Workers).  It reproduces the observable
 * behaviour of the previous ajv-based evaluator — the same ValidationIssue
 * kinds, instance paths, keywords, message strings and ordering — so that
 * every existing consumer and test reads the same results; the differential
 * test in test/validation-differential.test.mts holds it to that.
 *
 * Supported: Draft 2020-12 and Draft 7 dialects; boolean schemas; $ref with
 * $id-relative resolution, $anchor, embedded $id, JSON-pointer fragments and
 * the explicit `references` graph (never a network fetch); type, enum,
 * const; properties, patternProperties, additionalProperties, propertyNames,
 * required, minProperties, maxProperties, dependentRequired,
 * dependentSchemas, unevaluatedProperties; prefixItems, items (schema, and
 * Draft 7 array form with additionalItems), contains, minContains,
 * maxContains, minItems, maxItems, uniqueItems, unevaluatedItems; minLength,
 * maxLength, pattern, format; minimum, maximum, exclusiveMinimum,
 * exclusiveMaximum, multipleOf; allOf, anyOf, oneOf, not, if/then/else;
 * Draft 7 definitions and dependencies.  Every other keyword is an
 * annotation.
 */
/** JSON Schema documents admitted by this evaluator. */
export type JsonSchema = boolean | Readonly<Record<string, unknown>>;
/** JSON Schema dialects the evaluator supports explicitly. */
export declare const SUPPORTED_DIALECTS: readonly ["https://json-schema.org/draft/2020-12/schema", "http://json-schema.org/draft-07/schema#"];
/** One deterministic validation failure. */
export type ValidationIssue = Readonly<{
    kind: "instance" | "schema";
    path: string;
    keyword: string;
    message: string;
}>;
/** The validation outcome for one value and schema graph. */
export type ValidationResult = Readonly<{
    valid: boolean;
    issues: readonly ValidationIssue[];
}>;
/** Explicitly composed schemas available to `$ref` while evaluating a call. */
export type ValidationOptions = Readonly<{
    references?: readonly JsonSchema[];
}>;
/** One immutable compiled evaluator for an explicit schema graph. */
export type CompiledJsonSchema = Readonly<{
    validate(value: unknown): ValidationResult;
}>;
/** Admit one JSON Schema document without resolving application-specific references. */
export declare function validateJsonSchemaDocument(schema: JsonSchema): ValidationResult;
/**
 * Compile one schema graph without altering its documents or retaining ambient references.
 * The graph is snapshotted at compile time: a later mutation of the caller's schema objects
 * does not change what the compiled evaluator admits.
 */
export declare function compileJsonSchema(schema: JsonSchema, options?: ValidationOptions): CompiledJsonSchema;
/**
 * Validate a JSON-compatible value against a schema graph.
 *
 * @param value Value to validate.
 * @param schema Root Draft 2020-12 or Draft 7 schema.
 * @param options Explicit schemas available to cross-schema `$ref`.
 * @returns A deterministic, structured validation result without mutating the input value or schema graph.
 */
export declare function validateJsonSchema(value: unknown, schema: JsonSchema, options?: ValidationOptions): ValidationResult;
/**
 * Validates a JSON value against a JSON Schema document with a corpus of referenced schemas.
 * The request form of validateJsonSchema: { value, schema, schemas? } to { valid, errors }.
 */
export declare function validateJson(request: {
    value?: unknown;
    schema?: JsonSchema;
    schemas?: readonly JsonSchema[];
}): {
    valid: boolean;
    errors: readonly ValidationIssue[];
};
/** The request form of validateJsonSchema with explicit references: { value, schema, references? } to { valid, errors }. */
export declare function validateJsonSchemaInstance(request: {
    value?: unknown;
    schema?: JsonSchema;
    references?: readonly JsonSchema[];
}): {
    valid: boolean;
    errors: readonly ValidationIssue[];
};
