import { assertKeywordValues } from "../src/assert-keyword-values.mjs";
import { createHash } from "node:crypto";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/semantic-content-identity";
import { canonicalJson as canonical } from "@red-cup-engineering/json-services-section/canonical-json";
import { isJsonRecord } from "@red-cup-engineering/json-services-section/is-json-record";
import { requireJsonValue } from "@red-cup-engineering/json-services-section/require-json-value";
import type { JsonRecord, JsonValue } from "@red-cup-engineering/json-services-section/types";

export const DRAFT_2020_12 = "https://json-schema.org/draft/2020-12/schema" as const;

/** The exact vocabulary this bounded evaluator implements. */
export const SUPPORTED_VOCABULARY = Object.freeze([
  "$schema", "$id", "$ref", "$defs", "$comment", "$comment-absences",
  "title", "description", "default", "examples", "deprecated", "readOnly", "writeOnly",
  "type", "enum", "const",
  "required", "properties", "additionalProperties", "propertyNames", "minProperties", "maxProperties",
  "items", "minItems", "maxItems", "uniqueItems", "contains",
  "minLength", "maxLength", "pattern", "format",
  "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf",
  "allOf", "anyOf", "oneOf", "not", "if", "then", "else",
] as const);

const supported = new Set<string>(SUPPORTED_VOCABULARY);
const knownVocabulary = new Set<string>([
  ...SUPPORTED_VOCABULARY,
  "$anchor", "$dynamicRef", "$dynamicAnchor", "$vocabulary",
  "patternProperties", "dependentRequired", "dependentSchemas",
  "prefixItems", "minContains", "maxContains", "unevaluatedItems", "unevaluatedProperties",
  "contentEncoding", "contentMediaType", "contentSchema",
]);

export type Schema = Readonly<JsonRecord>;
export type SchemaNode = Schema | boolean;
export type Violation = Readonly<{ pointer: string; keyword: string; message: string }>;
export type Validation = Readonly<{ ok: boolean; errors: readonly Violation[] }>;
export type IdentityReceipt = Readonly<{
  id: string;
  schemaId: string;
  eavtEntity: null;
  filepath: null;
  canonicalBytes: string;
  sha256: string;
  ni: string;
  rmn: null;
  status: "sxc-ready-not-settled";
}>;
export type SchemaReceipt = Readonly<{ schema: Schema; identity: IdentityReceipt }>;

const immutable = <T,>(value: T): T => Object.freeze(value);
const escapePointer = (part: string): string => part.replaceAll("~", "~0").replaceAll("/", "~1");
const instancePointer = (parts: readonly (string | number)[]): string =>
  parts.length === 0 ? "" : `/${parts.map((part) => escapePointer(String(part))).join("/")}`;

function hash(bytes: string): { hex: string; ni: string } {
  const hex = createHash("sha256").update(bytes, "utf8").digest("hex");
  const ni = identifyJsonSemanticContent({ objectKind: "json-schema.canonical-value", value: JSON.parse(bytes), witnessRoot: EMPTY_WITNESS_ROOT }).token;
  return { hex, ni };
}

function immutableJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return Object.freeze(value.map(immutableJson));
  if (isJsonRecord(value)) {
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, child]) => [key, immutableJson(child)])));
  }
  return value;
}

function schemaNode(value: JsonValue, what: string): SchemaNode {
  if (typeof value === "boolean") return value;
  if (!isJsonRecord(value)) throw new TypeError(`${what} must be a JSON object or boolean schema`);
  return value;
}

function schemaRecord(value: JsonValue, what: string): Schema {
  if (!isJsonRecord(value)) throw new TypeError(`${what} must be a JSON object`);
  return value;
}

function childSchemas(schema: Schema): readonly [string, JsonValue][] {
  const out: [string, JsonValue][] = [];
  for (const key of ["$defs", "properties"]) {
    const group = schema[key];
    if (group === undefined) continue;
    if (!isJsonRecord(group)) throw new TypeError(`${key} must be an object`);
    for (const [name, child] of Object.entries(group)) out.push([`${key}/${escapePointer(name)}`, child]);
  }
  for (const key of ["items", "contains", "propertyNames", "not", "if", "then", "else", "additionalProperties"]) {
    const child = schema[key];
    if (child === undefined) continue;
    if (key === "additionalProperties" && typeof child === "boolean") continue;
    if (typeof child !== "boolean" && !isJsonRecord(child)) throw new TypeError(`${key} must be a JSON object or boolean schema`);
    out.push([key, child]);
  }
  for (const key of ["allOf", "anyOf", "oneOf"]) {
    const children = schema[key];
    if (children === undefined) continue;
    if (!Array.isArray(children)) throw new TypeError(`${key} must be an array`);
    children.forEach((child, index) => out.push([`${key}/${index}`, child]));
  }
  return out;
}

function admitSchema(node: SchemaNode, at: string, seen: Set<JsonValue>, allowUnknownAnnotations: boolean): void {
  if (typeof node === "boolean") return;
  if (seen.has(node)) return;
  seen.add(node);
  for (const key of Object.keys(node)) {
    if (!supported.has(key) && (knownVocabulary.has(key) || !allowUnknownAnnotations)) {
      throw new TypeError(`${at}: unsupported Draft 2020-12 keyword ${key}`);
    }
  }
  const dialect = node["$schema"];
  if (dialect !== undefined && dialect !== DRAFT_2020_12) {
    throw new TypeError(`${at}: unsupported dialect ${JSON.stringify(dialect)}`);
  }
  assertKeywordValues(node, at);
  const pattern = node.pattern;
  if (pattern !== undefined) {
    if (typeof pattern !== "string") throw new TypeError(`${at}/pattern must be a string`);
    try { new RegExp(pattern, "u"); } catch (error) {
      throw new TypeError(`${at}/pattern is invalid: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (node.format !== undefined && node.format !== "date" && node.format !== "date-time") {
    throw new TypeError(`${at}/format: unsupported format ${JSON.stringify(node.format)}`);
  }
  for (const [path, child] of childSchemas(node)) {
    admitSchema(schemaNode(child, `schema at ${at}/${path}`), `${at}/${path}`, seen, allowUnknownAnnotations);
  }
}

/** Canonicalize and admit one fixed-dialect schema without ambient authority. */
export function createSchema(input: unknown, id?: string, options: Readonly<{ allowUnknownAnnotations?: boolean }> = {}): SchemaReceipt {
  const value = requireJsonValue(input, "schema");
  const raw = schemaRecord(value, "schema");
  const claimed = raw["$id"];
  const chosen = id ?? (typeof claimed === "string" ? claimed : undefined);
  if (!chosen) throw new TypeError("schema requires a non-empty $id");
  if (claimed !== undefined && claimed !== chosen) throw new TypeError("schema $id disagrees with requested identity");
  if (raw["$schema"] !== undefined && raw["$schema"] !== DRAFT_2020_12) {
    throw new TypeError(`unsupported dialect ${JSON.stringify(raw["$schema"])}`);
  }
  const schema = schemaRecord(immutableJson({ ...raw, "$schema": DRAFT_2020_12, "$id": chosen }), "schema");
  admitSchema(schema, "$", new Set<JsonValue>(), options.allowUnknownAnnotations === true);
  const canonicalBytes = canonical(schema);
  const digest = hash(canonicalBytes);
  return immutable({
    schema,
    identity: immutable({
      id: chosen,
      schemaId: chosen,
      eavtEntity: null,
      filepath: null,
      canonicalBytes,
      sha256: digest.hex,
      ni: digest.ni,
      rmn: null,
      status: "sxc-ready-not-settled",
    }),
  });
}

/** Resolve an RFC 6901 JSON Pointer or URI-fragment spelling. */
export function resolvePointer(document: JsonValue, fragment: string): JsonValue | undefined {
  if (fragment === "" || fragment === "#") return document;
  let pointer = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  try { pointer = decodeURIComponent(pointer); } catch { return undefined; }
  if (!pointer.startsWith("/")) return undefined;
  let current: JsonValue | undefined = document;
  for (const escaped of pointer.slice(1).split("/")) {
    const part = escaped.replaceAll("~1", "/").replaceAll("~0", "~");
    if (Array.isArray(current)) {
      if (!/^(?:0|[1-9][0-9]*)$/u.test(part)) return undefined;
      current = current[Number(part)];
    } else if (isJsonRecord(current)) current = current[part];
    else return undefined;
  }
  return current;
}

export const resolveJsonPointer = resolvePointer;

export interface SchemaCorpus {
  readonly byId: ReadonlyMap<string, Schema>;
  readonly register: (schema: Schema) => void;
  readonly resolve: (ref: string, base: Schema) => SchemaNode | undefined;
}

export function schemaCorpus(initial: readonly Schema[] = []): SchemaCorpus {
  const byId = new Map<string, Schema>();
  const register = (schema: Schema): void => {
    const id = schema["$id"];
    if (typeof id !== "string" || id === "") throw new TypeError("schema corpus requires $id");
    if (byId.has(id)) throw new TypeError(`duplicate schema $id ${id}`);
    byId.set(id, schema);
  };
  initial.forEach(register);
  const resolve = (ref: string, base: Schema): SchemaNode | undefined => {
    if (ref.startsWith("#")) {
      const found = resolvePointer(base, ref);
      return found === undefined ? undefined : schemaNode(found, `ref ${ref}`);
    }
    const hashAt = ref.indexOf("#");
    const id = hashAt < 0 ? ref : ref.slice(0, hashAt);
    if (/^(?:https?|file|node):/iu.test(id) || id.startsWith("//")) return undefined;
    const target = byId.get(id);
    if (!target) return undefined;
    const found = hashAt < 0 ? target : resolvePointer(target, ref.slice(hashAt));
    return found === undefined ? undefined : schemaNode(found, `ref ${ref}`);
  };
  return immutable({ byId, register, resolve });
}

function typeOf(value: JsonValue): string {
  return value === null ? "null" : Array.isArray(value) ? "array" : Number.isInteger(value) ? "integer" : typeof value;
}

function typeMatches(expected: string, value: JsonValue): boolean {
  const actual = typeOf(value);
  return expected === "number" ? actual === "number" || actual === "integer" : actual === expected;
}

const same = (left: JsonValue, right: JsonValue): boolean => canonical(left) === canonical(right);

function formatMatches(format: string, value: string): boolean | undefined {
  if (format === "date") {
    const matched = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
    if (!matched) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }
  if (format === "date-time") {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(value)
      && formatMatches("date", value.slice(0, 10)) === true
      && Number.isFinite(Date.parse(value));
  }
  return undefined;
}

function validateNode(
  value: JsonValue,
  schema: SchemaNode,
  root: Schema,
  corpus: SchemaCorpus,
  errors: Violation[],
  at: readonly (string | number)[],
  stack: Set<Schema>,
): void {
  const pointer = instancePointer(at);
  const add = (keyword: string, message: string): void => {
    errors.push(immutable({ pointer, keyword, message }));
  };
  if (schema === true) return;
  if (schema === false) { add("false", "boolean false schema rejects every instance"); return; }
  if (stack.has(schema)) { add("$ref", "cyclic schema evaluation refused"); return; }
  stack.add(schema);

  for (const key of Object.keys(schema)) {
    if (knownVocabulary.has(key) && !supported.has(key)) add(key, "keyword is not implemented by this bounded evaluator");
  }

  const ref = schema["$ref"];
  if (typeof ref === "string") {
    const target = corpus.resolve(ref, root);
    if (target === undefined) add("$ref", `unresolved or external reference ${ref}`);
    else {
      const targetRoot = ref.startsWith("#") ? root : corpus.byId.get(ref.split("#", 1)[0]!) ?? root;
      validateNode(value, target, targetRoot, corpus, errors, at, new Set(stack));
    }
  }

  const declaredType = schema.type;
  if (typeof declaredType === "string") {
    if (!typeMatches(declaredType, value)) add("type", `expected ${declaredType}, got ${typeOf(value)}`);
  } else if (Array.isArray(declaredType)) {
    const types = declaredType.filter((entry): entry is string => typeof entry === "string");
    if (!types.some((entry) => typeMatches(entry, value))) add("type", `expected ${types.join(" or ")}, got ${typeOf(value)}`);
  }
  if (schema.const !== undefined && !same(value, schema.const)) add("const", "value differs from const");
  if (Array.isArray(schema.enum) && !schema.enum.some((item) => same(item, value))) add("enum", "value is not enumerated");

  if (typeof value === "string") {
    if (typeof schema.minLength === "number" && [...value].length < schema.minLength) add("minLength", "string too short");
    if (typeof schema.maxLength === "number" && [...value].length > schema.maxLength) add("maxLength", "string too long");
    if (typeof schema.pattern === "string") {
      try { if (!new RegExp(schema.pattern, "u").test(value)) add("pattern", "string does not match pattern"); }
      catch { add("pattern", "schema pattern is not a valid regular expression"); }
    }
    if (typeof schema.format === "string") {
      const matches = formatMatches(schema.format, value);
      if (matches === undefined) add("format", `unsupported format ${schema.format}`);
      else if (!matches) add("format", `string does not match ${schema.format}`);
    }
  }

  if (typeof value === "number") {
    const failures: readonly [string, boolean][] = [
      ["minimum", typeof schema.minimum === "number" && value < schema.minimum],
      ["maximum", typeof schema.maximum === "number" && value > schema.maximum],
      ["exclusiveMinimum", typeof schema.exclusiveMinimum === "number" && value <= schema.exclusiveMinimum],
      ["exclusiveMaximum", typeof schema.exclusiveMaximum === "number" && value >= schema.exclusiveMaximum],
      ["multipleOf", typeof schema.multipleOf === "number" && value % schema.multipleOf !== 0],
    ];
    for (const [keyword, failed] of failures) if (failed) add(keyword, "numeric constraint failed");
  }

  if (Array.isArray(value)) {
    if (typeof schema.minItems === "number" && value.length < schema.minItems) add("minItems", "array too short");
    if (typeof schema.maxItems === "number" && value.length > schema.maxItems) add("maxItems", "array too long");
    if (schema.uniqueItems === true && new Set(value.map((item) => canonical(item))).size !== value.length) add("uniqueItems", "array items are not unique");
    if (schema.items !== undefined && (typeof schema.items === "boolean" || isJsonRecord(schema.items))) {
      const child = schemaNode(schema.items, "items");
      value.forEach((item, index) => validateNode(item, child, root, corpus, errors, [...at, index], new Set(stack)));
    }
    if (schema.contains !== undefined && (typeof schema.contains === "boolean" || isJsonRecord(schema.contains))) {
      const child = schemaNode(schema.contains, "contains");
      const found = value.some((item, index) => {
        const inner: Violation[] = [];
        validateNode(item, child, root, corpus, inner, [...at, index], new Set(stack));
        return inner.length === 0;
      });
      if (!found) add("contains", "no array item matches contains");
    }
  }

  if (isJsonRecord(value)) {
    const keys = Object.keys(value);
    if (typeof schema.minProperties === "number" && keys.length < schema.minProperties) add("minProperties", "object has too few properties");
    if (typeof schema.maxProperties === "number" && keys.length > schema.maxProperties) add("maxProperties", "object has too many properties");
    const properties = isJsonRecord(schema.properties) ? schema.properties : {};
    for (const key of Array.isArray(schema.required) ? schema.required : []) {
      if (typeof key === "string" && !(key in value)) {
        errors.push(immutable({ pointer: instancePointer([...at, key]), keyword: "required", message: "property is required" }));
      }
    }
    for (const [key, child] of Object.entries(properties)) {
      if (key in value) validateNode(value[key] as JsonValue, schemaNode(child, `properties/${key}`), root, corpus, errors, [...at, key], new Set(stack));
    }
    if (schema.propertyNames !== undefined && (typeof schema.propertyNames === "boolean" || isJsonRecord(schema.propertyNames))) {
      const child = schemaNode(schema.propertyNames, "propertyNames");
      for (const key of keys) validateNode(key, child, root, corpus, errors, [...at, key], new Set(stack));
    }
    if (schema.additionalProperties !== undefined) {
      for (const key of keys) {
        if (key in properties) continue;
        if (schema.additionalProperties === false) {
          errors.push(immutable({ pointer: instancePointer([...at, key]), keyword: "additionalProperties", message: "property is not allowed" }));
        } else if (isJsonRecord(schema.additionalProperties)) {
          validateNode(value[key] as JsonValue, schema.additionalProperties, root, corpus, errors, [...at, key], new Set(stack));
        }
      }
    }
  }

  const isValid = (child: JsonValue): boolean => {
    const inner: Violation[] = [];
    validateNode(value, schemaNode(child, "subschema"), root, corpus, inner, at, new Set(stack));
    return inner.length === 0;
  };
  if (Array.isArray(schema.allOf)) {
    for (const child of schema.allOf) validateNode(value, schemaNode(child, "allOf"), root, corpus, errors, at, new Set(stack));
  }
  if (Array.isArray(schema.anyOf) && !schema.anyOf.some(isValid)) add("anyOf", "matches no branch");
  if (Array.isArray(schema.oneOf) && schema.oneOf.filter(isValid).length !== 1) add("oneOf", "must match exactly one branch");
  if (schema.not !== undefined && isValid(schema.not)) add("not", "matches forbidden branch");
  if (schema.if !== undefined) {
    const branch = isValid(schema.if) ? schema.then : schema.else;
    if (branch !== undefined) validateNode(value, schemaNode(branch, "conditional"), root, corpus, errors, at, new Set(stack));
  }
  stack.delete(schema);
}

/** A non-monotone instance judgment with no filesystem or remote resolution. */
export function validateInstance(instance: unknown, schema: SchemaNode, corpus?: SchemaCorpus): Validation {
  const value = requireJsonValue(instance, "instance");
  if (typeof schema === "boolean") {
    const errors: Violation[] = [];
    if (!schema) errors.push(immutable({ pointer: "", keyword: "false", message: "boolean false schema rejects every instance" }));
    return immutable({ ok: errors.length === 0, errors: Object.freeze(errors) });
  }
  const bounded = corpus ?? schemaCorpus([schema]);
  const errors: Violation[] = [];
  validateNode(value, schema, schema, bounded, errors, [], new Set<Schema>());
  return immutable({ ok: errors.length === 0, errors: Object.freeze(errors) });
}

/** Pure policy inspection recovered from the node-local schema writer. */
export function inspectSchema(input: unknown, poolIds: ReadonlySet<string> = new Set()): Validation {
  const errors: Violation[] = [];
  const add = (pointer: string, keyword: string, message: string): void => { errors.push(immutable({ pointer, keyword, message })); };
  let schema: JsonValue;
  try { schema = requireJsonValue(input, "schema"); }
  catch (error) { return immutable({ ok: false, errors: Object.freeze([immutable({ pointer: "", keyword: "schema", message: error instanceof Error ? error.message : String(error) })]) }); }
  if (!isJsonRecord(schema)) return immutable({ ok: false, errors: Object.freeze([immutable({ pointer: "", keyword: "schema", message: "schema must be a JSON object" })]) });
  if (schema["$schema"] !== DRAFT_2020_12) add("", "$schema", `dialect must be ${DRAFT_2020_12}`);
  if (typeof schema["$id"] !== "string" || schema["$id"] === "") add("", "$id", "schema requires a non-empty $id");
  if (schema.type === undefined) add("", "type", "schema pool requires a root type");
  const structural = ["type", "required", "properties", "enum", "const", "oneOf", "anyOf", "allOf", "$defs", "items"];
  if (!structural.some((key) => key in schema)) add("", "structure", "schema states no structure");

  const visit = (node: SchemaNode, pointer: string, root: Schema): void => {
    if (typeof node === "boolean") return;
    for (const key of Object.keys(node)) {
      if (knownVocabulary.has(key) && !supported.has(key)) add(pointer, key, "keyword is not implemented by this bounded evaluator");
    }
    if (node.additionalProperties === false && Array.isArray(node.required)) {
      const properties = isJsonRecord(node.properties) ? node.properties : {};
      for (const key of node.required) {
        if (typeof key === "string" && !(key in properties)) add(pointer, "required", `required key ${key} is not declared while additionalProperties is false`);
      }
    }
    if (typeof node["$ref"] === "string") {
      const ref = node["$ref"];
      if (ref.startsWith("#")) {
        if (resolvePointer(root, ref) === undefined) add(pointer, "$ref", `local reference ${ref} does not resolve`);
      } else {
        const externalId = ref.split("#", 1)[0]!;
        if (/^(?:https?|file|node):/iu.test(externalId) || !poolIds.has(externalId)) {
          add(pointer, "$ref", `reference ${ref} does not resolve in the bounded pool`);
        }
      }
    }
    if (node.type !== undefined && typeof node.type !== "string" && !Array.isArray(node.type)) add(pointer, "type", "type must be a string or string array");
    if (node.enum !== undefined && (!Array.isArray(node.enum) || node.enum.length === 0)) add(pointer, "enum", "enum must be a non-empty array");
    if (typeof node.pattern === "string") {
      try { new RegExp(node.pattern, "u"); } catch { add(pointer, "pattern", "pattern is not a valid regular expression"); }
    }
    if (node.format !== undefined && node.format !== "date" && node.format !== "date-time") {
      add(pointer, "format", `unsupported format ${String(node.format)}`);
    }
    for (const [path, child] of childSchemas(node)) visit(schemaNode(child, `schema at ${pointer}/${path}`), `${pointer}/${path}`, root);
  };
  visit(schema, "", schema);
  // A JSON record since the guard at the top of the function.
  const definitions = (schema as Record<string, unknown>)["$defs"];
  for (const name of Object.keys(isJsonRecord(definitions) ? definitions : {})) {
    if (!canonical(schema).includes(JSON.stringify(`#/$defs/${name}`))) add(`/$defs/${escapePointer(name)}`, "$defs", "definition is never referenced");
  }
  return immutable({ ok: errors.length === 0, errors: Object.freeze(errors) });
}

// The schema-assertion trace has one implementation, shared with the request/response
// operations under scripts/: plain JavaScript with a sibling declaration file.
export type { SchemaAssertion, SchemaContradiction, SchemaCohereResult } from "../src/schema-assertion-trace.mjs";
export {
  assertSchemaAssertion,
  cohereSchemaAssertions,
  foldSchema,
  foldSchemaAssertions,
  mergeSchemaAssertions,
  parseSchemaAssertions,
  projectSchemaAssertions,
  schemaAssertionEavt,
  schemaAssertionEavtId,
  schemaAssertionId,
  schemaAssertionTriple,
  serializeSchemaAssertions,
  unfoldSchema,
} from "../src/schema-assertion-trace.mjs";
