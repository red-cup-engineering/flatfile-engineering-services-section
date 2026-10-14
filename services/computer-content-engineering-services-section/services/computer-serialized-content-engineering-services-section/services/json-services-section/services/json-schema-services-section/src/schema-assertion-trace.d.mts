import type { JsonRecord, JsonValue } from "@red-cup-engineering/json-services-section/types";

export type SchemaAssertion = Readonly<{ e: string; a: string; v: JsonValue; t: string }>;
export type SchemaContradiction = Readonly<{
  e: string;
  a: string;
  values: readonly JsonValue[];
  assertions: readonly SchemaAssertion[];
}>;
export type SchemaCohereResult = Readonly<{
  schema: Readonly<JsonRecord> | null;
  contradictions: readonly SchemaContradiction[];
}>;

export function assertSchemaAssertion(value: unknown): SchemaAssertion;
export function schemaAssertionId(assertion: SchemaAssertion): string;
export function parseSchemaAssertions(content: string): SchemaAssertion[];
export function serializeSchemaAssertions(assertions: readonly SchemaAssertion[]): string;
export function mergeSchemaAssertions(...traces: readonly (readonly SchemaAssertion[])[]): SchemaAssertion[];
export function unfoldSchema(
  schema: unknown,
  options: { readonly base?: string; readonly t: string } | string,
  legacyBase?: string,
): readonly SchemaAssertion[];
export function foldSchema(assertions: readonly SchemaAssertion[]): Readonly<JsonRecord>;
export function cohereSchemaAssertions(assertions: readonly SchemaAssertion[]): SchemaCohereResult;
export const foldSchemaAssertions: typeof cohereSchemaAssertions;
export function projectSchemaAssertions(
  assertions: readonly SchemaAssertion[],
  options: { readonly id: string },
): SchemaCohereResult;
export function schemaAssertionTriple(assertion: SchemaAssertion): Readonly<{ s: JsonValue; p: JsonValue; o: JsonValue }>;
export function schemaAssertionEavt(assertion: SchemaAssertion): readonly [JsonValue, JsonValue, JsonValue, JsonValue];
export function schemaAssertionEavtId(assertion: SchemaAssertion): string;
