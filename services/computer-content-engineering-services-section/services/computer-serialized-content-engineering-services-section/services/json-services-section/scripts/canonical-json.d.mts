import type { JsonValue } from '../src/json-value.mjs';
export type JsonEnvelope = Readonly<{
  maxSourceBytes: number; maxCanonicalBytes: number; maxDepth: number;
  maxNodes: number; maxObjectMembers: number; maxArrayLength: number;
  maxStringBytes: number; maxKeyBytes: number;
}>;
export type CanonicalJson = Readonly<{ value: JsonValue; text: string; byteLength: number }>;
export const CANONICAL_JSON_PROFILE: 'RFC8785';
export const inputSchema: Readonly<Record<string, unknown>>;
export const outputSchema: Readonly<{ type: 'string' }>;
export const UNBOUNDED_JSON_ENVELOPE: JsonEnvelope;
export const JSON_RESOURCE_ENVELOPE: JsonEnvelope;
export function canonicalizeJson(value: unknown, envelope?: JsonEnvelope): CanonicalJson;
export function admitCanonicalJson(source: string | ArrayBuffer | ArrayBufferView, envelope?: JsonEnvelope): CanonicalJson;
export function canonicalJson(value: unknown, envelope?: JsonEnvelope): string;
export function canonicalJsonValue(value: unknown): JsonValue;
export default canonicalJson;
