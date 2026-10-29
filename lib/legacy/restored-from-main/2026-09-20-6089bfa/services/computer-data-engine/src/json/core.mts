/**
 * codecs/text/json - the JSON representation boundary.
 *
 * JSON is the wire form for everything passed *between* scripts. This boundary
 * witnesses JSON membership, canonicalizes (object keys sorted, stable bytes so
 * idempotence is detectable across a pipe), and projects JSON-line documents.
 * Free data enters or leaves only through here; core code works over carriers.
 */
import { canonicalJson } from "../identity/canonical-json.mjs";
import { define, type Projector, type Resource } from "@red-cup-engineering/typed-resource-classification-kernel-service";

/** A JSON value: the closed universe of JSON. */
export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };
/** A JSON object. */
export type JsonRecord = { readonly [key: string]: JsonValue };

/** Whether a value inhabits the JSON universe (finite numbers only, plain objects). */
export function isJsonValue(value: unknown): value is JsonValue {
  return isJsonValueAt(value, new Set());
}

function isJsonValueAt(value: unknown, ancestors: Set<object>): value is JsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) {
    if (ancestors.has(value)) return false;
    ancestors.add(value);
    for (let index = 0; index < value.length; index += 1) {
      if (!(index in value) || !isJsonValueAt(value[index], ancestors)) {
        ancestors.delete(value);
        return false;
      }
    }
    ancestors.delete(value);
    return true;
  }
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    if (ancestors.has(value)) return false;
    ancestors.add(value);
    for (const key of Object.keys(value)) {
      if (!isJsonValueAt((value as Record<string, unknown>)[key], ancestors)) {
        ancestors.delete(value);
        return false;
      }
    }
    ancestors.delete(value);
    return true;
  }
  return false;
}

/** Whether a value is a JSON object (not null, not an array). */
export function isJsonRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

/**
 * Whether a value is an object record at a runtime boundary.
 *
 * Unlike isJsonRecord, this preserves the permissive object semantics used by
 * callers that intentionally admit class instances or null-prototype records.
 * It is not evidence that the contained values are JSON.
 */
export function isObjectRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Witness a value as JSON or throw — the free-data gate. */
export function requireJsonValue(value: unknown, context: string): JsonValue {
  if (!isJsonValue(value)) throw new TypeError(`${context}: not a JSON value`);
  return value;
}

/** Describe a value for a JSON boundary error. */
export function describeJsonValue(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

type JsonKind = "array" | "boolean" | "number" | "object" | "string";
type JsonKindValue = { array: readonly JsonValue[]; boolean: boolean; number: number; object: JsonRecord; string: string };

function isJsonKind<K extends JsonKind>(value: JsonValue, kind: K): value is JsonKindValue[K] {
  return kind === "array" ? Array.isArray(value) : kind === "object" ? isJsonRecord(value) : typeof value === kind;
}

function requireJsonKind<K extends JsonKind>(value: unknown, context: string, kind: K, errorPrefix: string): JsonKindValue[K] {
  const json = requireJsonValue(value, context);
  if (!isJsonKind(json, kind)) throw new TypeError(`${errorPrefix}: expected ${kind} for ${context}, got ${describeJsonValue(value)}`);
  return json;
}

/** Require a JSON object, retaining the caller's error vocabulary. */
export const requireJsonRecord = (value: unknown, context: string, errorPrefix = "json-codec"): JsonRecord =>
  requireJsonKind(value, context, "object", errorPrefix);

/** Require a JSON string, retaining the caller's error vocabulary. */
export const requireJsonString = (value: unknown, context: string, errorPrefix = "json-codec"): string =>
  requireJsonKind(value, context, "string", errorPrefix);

/** Require a finite JSON number, retaining the caller's error vocabulary. */
export const requireJsonNumber = (value: unknown, context: string, errorPrefix = "json-codec"): number =>
  requireJsonKind(value, context, "number", errorPrefix);

/** Require a JSON array, retaining the caller's error vocabulary. */
export const requireJsonArray = (value: unknown, context: string, errorPrefix = "json-codec"): readonly JsonValue[] =>
  requireJsonKind(value, context, "array", errorPrefix);

/** Require a JSON boolean, retaining the caller's error vocabulary. */
export const requireJsonBoolean = (value: unknown, context: string, errorPrefix = "json-codec"): boolean =>
  requireJsonKind(value, context, "boolean", errorPrefix);

/** Read a present JSON record field, retaining the caller's error vocabulary. */
export function requireJsonField(record: JsonRecord, key: string, context: string, errorPrefix = "json-codec"): JsonValue {
  if (!Object.prototype.hasOwnProperty.call(record, key)) {
    throw new TypeError(`${errorPrefix}: missing field "${key}" in ${context}`);
  }
  return record[key]!;
}

/** Parse JSON text and witness the result as a JSON value. */
export function parse(text: string): JsonValue {
  return requireJsonValue(JSON.parse(text), "json");
}

/** Witness an arbitrary runtime value as a JSON resource by round-tripping it
 *  through JSON and checking membership. The boundary gate for carriers (frozen
 *  class instances, etc.) whose enumerable shape is JSON. */
export function jsonResource(value: unknown, context = "json resource"): JsonValue {
  return requireJsonValue(JSON.parse(JSON.stringify(value)) as unknown, context);
}

/**
 * Canonicalizes a JSON value with the RFC 8785 JSON Canonicalization Scheme.
 *
 * @example
 * ```js
 * import { canonical } from "@red-cup-engineering/json-codec-service";
 *
 * canonical({ b: 2, a: 1 }); // "{\"a\":1,\"b\":2}"
 * ```
 */
export function canonical(value: JsonValue): string;
export function canonical(value: JsonValue): string {
  return canonicalJson(value);
}

/**
 * Witnesses generic JSON admission before producing RFC 8785 canonical bytes.
 */
export function canonicalChecked(value: unknown, context = "canonical JSON"): string {
  return canonicalJson(requireJsonValue(value, context));
}

/** The non-blank lines of a document. */
export const nonBlankLines = (content: string): string[] =>
  content.split("\n").filter((line) => line.trim() !== "");

/** Parse newline-delimited JSON, skipping blank lines; each line witnessed. */
export function parseLines(content: string): JsonValue[] {
  const out: JsonValue[] = [];
  let nonBlankIndex = 0;
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    nonBlankIndex += 1;
    try {
      out.push(parse(trimmed));
    } catch (error) {
      throw new TypeError(`line ${nonBlankIndex}: ${error instanceof Error ? error.message : "invalid JSON"}`);
    }
  }
  return out;
}

/** Serialize values as newline-delimited canonical JSON (trailing newline). */
export function serializeLines(values: readonly JsonValue[]): string {
  return values.length === 0 ? "" : `${values.map((value) => canonicalChecked(value, "jsonl item")).join("\n")}\n`;
}

/** The JSON projector: recognizes any content that parses as JSON; reads it as a
 *  single carried value; writes one canonical document. */
export const jsonProjector: Projector<JsonValue> = define<JsonValue>({
  type: "json",
  corner: "data",
  rung: "identity",
  recognize: (resource: Resource) => {
    try {
      JSON.parse(resource.content);
      return true;
    } catch {
      return false;
    }
  },
  read: (resource) => [parse(resource.content)],
  write: (items) => (items.length === 0 ? "" : `${canonicalChecked(items[0], "json projector item")}\n`),
});

/** The JSON-lines projector reads each nonblank line as an independent carried value. */
export const jsonlProjector: Projector<JsonValue> = define<JsonValue>({
  type: "jsonl",
  corner: "data",
  rung: "identity",
  recognize: (resource) => {
    try {
      parseLines(resource.content);
      return true;
    } catch {
      return false;
    }
  },
  read: (resource) => parseLines(resource.content),
  write: (items) => serializeLines(items),
});
