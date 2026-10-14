import type { JsonRecord, JsonValue } from '../src/json-value.mjs';
export const inputSchema: Readonly<Record<string, unknown>>;
export const outputSchema: Readonly<Record<string, unknown>>;
/** Record shape alone does not admit the object's child values as JSON. */
export function isJsonRecord(value: JsonValue): value is JsonRecord;
export function isJsonRecord(value: unknown): value is Record<string, unknown>;
