import { compileJsonSchema } from "@red-cup-engineering/computer-data-engine/validation";
export { validateJsonSchemaInstance } from "@red-cup-engineering/computer-data-engine/validation";
import { createHash } from "node:crypto";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/relation-model-notation-runtime/semantic-content-identity";
import {
  canonical,
  isJsonRecord,
  isJsonValue,
  requireJsonValue,
  type JsonRecord,
  type JsonValue,
} from "../../../src/index.mjs";

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
export type CanonicalJsonIntegrity = Readonly<{
  mediaType: "application/schema+json";
  canonicalBytes: string;
  rawSha256: string;
}>;
export type SemanticContentCommitment = Readonly<{
  token: string;
  mediaType: "application/rmn+cbor";
  cborBytes: Uint8Array;
  normalizedEnvelope: unknown;
}>;
export type IdentityReceipt = Readonly<{
  schemaId: string;
  canonicalJson: CanonicalJsonIntegrity;
  semantic: SemanticContentCommitment;
}>;
export type SchemaReceipt = Readonly<{ schema: Schema; identity: IdentityReceipt }>;

const immutable = <T,>(value: T): T => Object.freeze(value);
const escapePointer = (part: string): string => part.replaceAll("~", "~0").replaceAll("/", "~1");

/** Raw SHA-256 is byte-integrity evidence only; it is never a semantic content token. */
function rawSha256Digest(bytes: string): Readonly<{ hex: string }> {
  return immutable({ hex: createHash("sha256").update(bytes, "utf8").digest("hex") });
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
  const semantic = identifyJsonSemanticContent({ objectKind: "json-schema.canonical-value", value: schema, witnessRoot: EMPTY_WITNESS_ROOT });
  return immutable({
    schema,
    identity: immutable({
      schemaId: chosen,
      canonicalJson: immutable({ mediaType: "application/schema+json", canonicalBytes, rawSha256: rawSha256Digest(canonicalBytes).hex }),
      semantic: immutable({ token: semantic.token, mediaType: semantic.mediaType, cborBytes: Uint8Array.from(semantic.bytes), normalizedEnvelope: semantic.envelope }),
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

/** A non-monotone instance judgment over the shared Data evaluator and an explicit corpus. */
export function validateInstance(instance: unknown, schema: SchemaNode, corpus?: SchemaCorpus): Validation {
  const value = requireJsonValue(instance, "instance");
  const references = [...(corpus?.byId.values() ?? [])].filter((reference) => reference !== schema);
  const errors: Violation[] = [];
  // Retain this service's admitted dialect and reference policy without
  // carrying a second instance evaluator.
  const bounded = corpus ?? (typeof schema === "boolean" ? schemaCorpus() : schemaCorpus([schema]));
  const seen = new Set<Schema>();
  const admitted = new Set<JsonValue>();
  const inspect = (node: SchemaNode, root: SchemaNode): void => {
    if (typeof node === "boolean" || seen.has(node)) return;
    seen.add(node);
    admitSchema(node, "", admitted, true);
    if (typeof node.$ref === "string" && typeof root !== "boolean") {
      const target = bounded.resolve(node.$ref, root);
      if (target === undefined) errors.push(immutable({ pointer: "", keyword: "$ref", message: "unresolved or external reference " + node.$ref }));
      else inspect(target, node.$ref.startsWith("#") ? root : bounded.byId.get(node.$ref.split("#", 1)[0]!) ?? root);
    }
    for (const [, child] of childSchemas(node)) inspect(schemaNode(child, "subschema"), root);
  };
  try { inspect(schema, schema); }
  catch (error) { errors.push(immutable({ pointer: "", keyword: "schema", message: error instanceof Error ? error.message : String(error) })); }
  if (errors.length === 0) {
    const result = compileJsonSchema(schema, { references }).validate(value);
    for (const issue of result.issues) errors.push(immutable({ pointer: issue.path, keyword: issue.keyword, message: issue.message }));
  }
  return immutable({ ok: errors.length === 0, errors: Object.freeze(errors) });
}

/** Pure policy inspection recovered from the node-local schema writer. */
export function inspectSchema(schema: unknown, poolIds: ReadonlySet<string> = new Set()): Validation {
  const errors: Violation[] = [];
  const add = (pointer: string, keyword: string, message: string): void => { errors.push(immutable({ pointer, keyword, message })); };
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
  for (const name of Object.keys(isJsonRecord(schema["$defs"]) ? schema["$defs"] : {})) {
    if (!canonical(schema).includes(JSON.stringify(`#/$defs/${name}`))) add(`/$defs/${escapePointer(name)}`, "$defs", "definition is never referenced");
  }
  return immutable({ ok: errors.length === 0, errors: Object.freeze(errors) });
}

export type SchemaAssertion = Readonly<{ e: string; a: string; v: JsonValue; t: string }>;
export type SchemaContradiction = Readonly<{
  e: string;
  a: string;
  values: readonly JsonValue[];
  assertions: readonly SchemaAssertion[];
}>;
export type SchemaCohereResult = Readonly<{ schema: Schema | null; contradictions: readonly SchemaContradiction[] }>;

export function assertSchemaAssertion(value: unknown): SchemaAssertion {
  if (!isJsonRecord(value)) throw new TypeError("schema assertion must be a JSON object");
  const { e, a, v, t } = value;
  if (typeof e !== "string" || e === "") throw new TypeError("schema assertion e must be a non-empty string");
  if (typeof a !== "string" || a === "") throw new TypeError("schema assertion a must be a non-empty string");
  if (!isJsonValue(v)) throw new TypeError("schema assertion v must be a JSON value");
  if (typeof t !== "string" || t === "") throw new TypeError("schema assertion t must be a non-empty string");
  return immutable({ e, a, v, t });
}

export function schemaAssertionId(assertion: SchemaAssertion): string {
  return rawSha256Digest(canonical(assertSchemaAssertion(assertion) as unknown as JsonValue)).hex;
}

export function parseSchemaAssertions(content: string): SchemaAssertion[] {
  const out: SchemaAssertion[] = [];
  for (const [index, line] of content.split("\n").entries()) {
    if (line.trim() === "") continue;
    try { out.push(assertSchemaAssertion(JSON.parse(line) as unknown)); }
    catch (error) {
      throw new TypeError(`line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return out;
}

export function serializeSchemaAssertions(assertions: readonly SchemaAssertion[]): string {
  return assertions.length === 0 ? "" : `${assertions.map((row) => canonical(assertSchemaAssertion(row) as unknown as JsonValue)).join("\n")}\n`;
}

export function mergeSchemaAssertions(...traces: readonly (readonly SchemaAssertion[])[]): SchemaAssertion[] {
  const rows = new Map<string, SchemaAssertion>();
  for (const row of traces.flat().map(assertSchemaAssertion)) rows.set(schemaAssertionId(row), row);
  return [...rows.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, row]) => row);
}

/** Unfold a schema into the historical EAVT pointer-cell representation. */
export function unfoldSchema(schema: unknown, options: { readonly base?: string; readonly t: string } | string, legacyBase = ""): readonly SchemaAssertion[] {
  const opts = typeof options === "string" ? { base: legacyBase, t: options } : options;
  if (!opts.t) throw new TypeError("unfoldSchema: assertion time is required");
  const admitted = schemaRecord(requireJsonValue(schema, "schema"), "schema");
  const rows: SchemaAssertion[] = [];
  const walk = (node: JsonValue, pointer: string): void => {
    if (node === null || typeof node !== "object") return;
    const entries: readonly (readonly [string, JsonValue])[] = Array.isArray(node)
      ? node.map((item, index) => [String(index), item] as const)
      : Object.entries(node);
    for (const [key, item] of entries) {
      if (key === "") throw new TypeError("unfoldSchema: object keys must be non-empty");
      const container = item !== null && typeof item === "object";
      const carried: JsonValue = Array.isArray(item) ? [] : container ? {} : item;
      rows.push(immutable({ e: `${opts.base ?? ""}#${pointer}`, a: key, v: carried, t: opts.t }));
      if (container) walk(item, `${pointer}/${escapePointer(key)}`);
    }
  };
  walk(admitted, "");
  return Object.freeze(rows);
}

function pointerOf(entity: string): string {
  const hashAt = entity.indexOf("#");
  return hashAt < 0 ? entity : entity.slice(hashAt + 1);
}

export function foldSchema(assertions: readonly SchemaAssertion[]): Schema {
  const nodes = new Map<string, JsonValue>([["", {}]]);
  const depth = (pointer: string): number => pointer === "" ? 0 : pointer.split("/").length - 1;
  const rows = assertions.map(assertSchemaAssertion).sort((left, right) => depth(pointerOf(left.e)) - depth(pointerOf(right.e)));
  for (const row of rows) {
    const pointer = pointerOf(row.e);
    const parent = nodes.get(pointer);
    if (parent === undefined) throw new TypeError(`foldSchema: no node at pointer ${JSON.stringify(pointer)}`);
    let materialized = row.v;
    if (row.v !== null && typeof row.v === "object") {
      materialized = Array.isArray(row.v) ? [] : {};
      nodes.set(`${pointer}/${escapePointer(row.a)}`, materialized);
    }
    if (Array.isArray(parent)) parent[Number(row.a)] = materialized;
    else (parent as Record<string, JsonValue>)[row.a] = materialized;
  }
  return schemaRecord(immutableJson(requireJsonValue(nodes.get("") ?? {}, "folded schema")), "folded schema");
}

export function cohereSchemaAssertions(assertions: readonly SchemaAssertion[]): SchemaCohereResult {
  const cells = new Map<string, SchemaAssertion[]>();
  for (const row of assertions.map(assertSchemaAssertion)) {
    const key = `${canonical(row.e)}\0${row.a}`;
    cells.set(key, [...(cells.get(key) ?? []), row]);
  }
  const accepted: SchemaAssertion[] = [];
  const contradictions: SchemaContradiction[] = [];
  for (const rows of cells.values()) {
    const values = new Map(rows.map((row) => [canonical(row.v), row.v]));
    if (values.size > 1) {
      contradictions.push(immutable({
        e: rows[0]!.e,
        a: rows[0]!.a,
        values: Object.freeze([...values.values()]),
        assertions: Object.freeze([...rows]),
      }));
    } else accepted.push(rows.reduce((left, right) => left.t >= right.t ? left : right));
  }
  contradictions.sort((left, right) => `${left.e}\0${left.a}`.localeCompare(`${right.e}\0${right.a}`));
  return immutable({
    schema: contradictions.length === 0 ? foldSchema(accepted) : null,
    contradictions: Object.freeze(contradictions),
  });
}

export const foldSchemaAssertions = cohereSchemaAssertions;

export function projectSchemaAssertions(assertions: readonly SchemaAssertion[], options: { readonly id: string }): SchemaCohereResult {
  const result = cohereSchemaAssertions(assertions);
  if (result.schema === null) return result;
  const claimed = result.schema["$id"];
  if (typeof claimed === "string" && claimed !== options.id) {
    throw new TypeError(`projectSchemaAssertions: claimed $id ${JSON.stringify(claimed)} does not match ${JSON.stringify(options.id)}`);
  }
  const { ["$schema"]: _dialect, ["$id"]: _id, ...rest } = result.schema;
  return immutable({
    schema: schemaRecord(immutableJson({ "$schema": DRAFT_2020_12, "$id": options.id, ...rest }), "projected schema"),
    contradictions: Object.freeze([]),
  });
}

export function schemaAssertionTriple(assertion: SchemaAssertion): Readonly<{ s: JsonValue; p: JsonValue; o: JsonValue }> {
  const row = assertSchemaAssertion(assertion);
  return immutable({ s: row.e, p: row.a, o: row.v });
}

export function schemaAssertionEavt(assertion: SchemaAssertion): readonly [JsonValue, JsonValue, JsonValue, JsonValue] {
  const row = assertSchemaAssertion(assertion);
  return Object.freeze([row.e, row.a, row.v, row.t]);
}

export function schemaAssertionEavtId(assertion: SchemaAssertion): string {
  return rawSha256Digest(canonical(assertSchemaAssertion(assertion))).hex;
}
