import type { JsonValue } from '../src/json-value.mjs';
export const inputSchema: Readonly<Record<string, unknown>>;
export const outputSchema: Readonly<Record<string, unknown>>;
/** Admit the same value, or throw a TypeError identifying its first defect. */
export function requireJsonValue(value: unknown, context?: string): JsonValue;
