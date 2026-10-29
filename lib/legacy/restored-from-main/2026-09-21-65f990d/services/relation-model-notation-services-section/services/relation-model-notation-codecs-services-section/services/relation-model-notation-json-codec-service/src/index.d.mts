import type { Tm, Ty } from "@red-cup-engineering/relation-model-notation/types";

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export const arrayTag: "rmn.json.array";
export const objectTag: "rmn.json.object";
export const nullTag: "rmn.json.null";
export const booleanTag: "rmn.json.boolean";
export const stringTag: "rmn.json.string";
export const numberTag: "rmn.json.number";

export function listTerm(items: readonly Tm[]): Tm;
export function typedListTerm(itemType: Ty, items: readonly Tm[]): Tm;
export function typedListItems(term: Tm): readonly Tm[];
export function listTy(itemType: Ty): Ty;
export function termList(term: Tm): readonly Tm[];
export function isValueTerm(term: Tm): boolean;
export function arrayHeadTail(term: Tm): "empty" | Readonly<{ head: Tm; tail: Tm }> | undefined;
export function objectTerm(entries: ReadonlyArray<readonly [string, Tm]>): Tm;
export function arrayTerm(items: readonly Tm[]): Tm;
export function stringTerm(value: string): Tm;
export function projectField(fieldNames: readonly string[], key: string, objectValue: Tm): Tm;
export function objectTy(fieldNames: readonly string[], fieldTypes?: Readonly<Record<string, Ty>>): Ty;
export function arrayTy(itemTypes: readonly Ty[]): Ty;
export type RmnJsonDescriptor =
  | Readonly<{ kind: "scalar" }>
  | Readonly<{ kind: "null" }>
  | Readonly<{ kind: "boolean" }>
  | Readonly<{ kind: "number" }>
  | Readonly<{ kind: "string" }>
  | Readonly<{ kind: "list"; item: RmnJsonDescriptor }>
  | Readonly<{ kind: "record"; fields: Readonly<Record<string, RmnJsonDescriptor>> }>;
export const scalarDescriptor: RmnJsonDescriptor;
export const nullDescriptor: RmnJsonDescriptor;
export const booleanDescriptor: RmnJsonDescriptor;
export const numberDescriptor: RmnJsonDescriptor;
export const stringDescriptor: RmnJsonDescriptor;
export function listDescriptor(item: RmnJsonDescriptor): RmnJsonDescriptor;
export function recordDescriptor(fields: Readonly<Record<string, RmnJsonDescriptor>>): RmnJsonDescriptor;
export function descriptorTy(descriptor: RmnJsonDescriptor): Ty;
export function encodeDescriptor(descriptor: RmnJsonDescriptor, value: JsonValue): Tm;
export function decodeDescriptor(descriptor: RmnJsonDescriptor, term: Tm): JsonValue;
export function jsonToTerm(value: JsonValue): Tm;
export function encodeJsonTermCanonical(value: JsonValue): Uint8Array;
export function termToJson(term: Tm): JsonValue;

/** Cross native truth-axis decisions and schema-admitted JSON Booleans. */
export declare function booleanResultTerm(decision: Tm): Tm;
export declare function booleanConditionTerm(value: Tm): Tm;
