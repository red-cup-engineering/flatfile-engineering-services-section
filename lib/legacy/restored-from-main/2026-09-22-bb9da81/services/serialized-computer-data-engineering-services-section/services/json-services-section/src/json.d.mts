/** A JSON value: the closed universe of JSON. */
export type JsonValue = null | boolean | number | string | readonly JsonValue[] | {
    readonly [key: string]: JsonValue;
};
/** A JSON object. */
export type JsonRecord = {
    readonly [key: string]: JsonValue;
};
/** Whether a value inhabits the JSON universe (finite numbers only, plain objects). */
export declare function isJsonValue(value: unknown): value is JsonValue;
/** Whether a value is a JSON object (not null, not an array). */
export declare function isJsonRecord(value: unknown): value is JsonRecord;
/**
 * Whether a value is an object record at a runtime boundary.
 *
 * Unlike isJsonRecord, this preserves the permissive object semantics used by
 * callers that intentionally admit class instances or null-prototype records.
 * It is not evidence that the contained values are JSON.
 */
export declare function isObjectRecord(value: unknown): value is Record<PropertyKey, unknown>;
/** Witness a value as JSON or throw — the free-data gate. */
export declare function requireJsonValue(value: unknown, context: string): JsonValue;
/** Describe a value for a JSON boundary error. */
export declare function describeJsonValue(value: unknown): string;
/** Require a JSON object, retaining the caller's error vocabulary. */
export declare const requireJsonRecord: (value: unknown, context: string, errorPrefix?: string) => JsonRecord;
/** Require a JSON string, retaining the caller's error vocabulary. */
export declare const requireJsonString: (value: unknown, context: string, errorPrefix?: string) => string;
/** Require a finite JSON number, retaining the caller's error vocabulary. */
export declare const requireJsonNumber: (value: unknown, context: string, errorPrefix?: string) => number;
/** Require a JSON array, retaining the caller's error vocabulary. */
export declare const requireJsonArray: (value: unknown, context: string, errorPrefix?: string) => readonly JsonValue[];
/** Require a JSON boolean, retaining the caller's error vocabulary. */
export declare const requireJsonBoolean: (value: unknown, context: string, errorPrefix?: string) => boolean;
/** Read a present JSON record field, retaining the caller's error vocabulary. */
export declare function requireJsonField(record: JsonRecord, key: string, context: string, errorPrefix?: string): JsonValue;
/** Parse JSON text and witness the result as a JSON value. */
export declare function parse(text: string): JsonValue;
/** Witness an arbitrary runtime value as a JSON resource by round-tripping it
 *  through JSON and checking membership. The boundary gate for carriers (frozen
 *  class instances, etc.) whose enumerable shape is JSON. */
export declare function jsonResource(value: unknown, context?: string): JsonValue;
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
export declare function canonical(value: JsonValue): string;
/**
 * Witnesses generic JSON admission before producing RFC 8785 canonical bytes.
 */
export declare function canonicalChecked(value: unknown, context?: string): string;
/** The non-blank lines of a document. */
export declare const nonBlankLines: (content: string) => string[];
/** Parse newline-delimited JSON, skipping blank lines; each line witnessed. */
export declare function parseLines(content: string): JsonValue[];
/** Serialize values as newline-delimited canonical JSON (trailing newline). */
export declare function serializeLines(values: readonly JsonValue[]): string;

/**
 * Asserts that a value is an admitted RFC 8785 JSON value.
 * @param {unknown} value Value to validate.
 * @returns {unknown} The admitted value.
 * @throws {TypeError} When the value contains a non-JSON JavaScript value, sparse array, cycle, non-finite number, or lone surrogate.
 */
export function assertCanonicalJson(value: unknown): unknown;
/**
 * Tests whether a value is admitted by RFC 8785 JSON validation.
 * @param {unknown} value Value to validate.
 * @returns {boolean} Whether the value is admitted.
 */
export function isCanonicalJson(value: unknown): boolean;
/**
 * Produces RFC 8785 canonical JSON text using ECMAScript primitive serialization.
 * @param {unknown} value An admitted JSON value.
 * @returns {string} Canonical JSON text.
 * @throws {TypeError} When the value is not admitted JSON.
 */
export function canonicalJson(value: unknown): string;
/** @type {"RFC8785"} */
export const CANONICAL_JSON_PROFILE: "RFC8785";
export default canonicalJson;

export type Json = JsonValue;
export declare const isJson: typeof isJsonValue;
export declare const json: (value: unknown, context?: string) => JsonValue;
export declare const encodeJson: typeof canonicalChecked;
export declare const decodeJson: typeof parse;
export declare const encodeJsonLines: typeof serializeLines;
export declare const decodeJsonLines: typeof parseLines;
