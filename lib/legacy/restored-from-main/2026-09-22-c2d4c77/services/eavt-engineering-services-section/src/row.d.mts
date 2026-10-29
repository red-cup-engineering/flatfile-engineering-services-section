// Hand-written declaration file. This package ships plain .mjs (no build
// step, no TypeScript source) — this file exists only so strict TypeScript
// consumers can typecheck against it.

import type { JsonValue } from "../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import type { Tm } from "@red-cup-engineering/relation-model-notation/types";
import type { NormalizedSemanticContentIdentity } from "@red-cup-engineering/relation-model-notation-runtime/semantic-content-identity";

/** Non-semantic JSON compatibility spelling of an EAVT row. */
export interface WitnessJournalEntry {
  readonly e: JsonValue;
  readonly a: JsonValue;
  readonly v: JsonValue;
  readonly t: JsonValue;
}

/** Semiotic EAVT source row. E/A/V are direct, closed typed RMN terms. */
export interface Seavt {
  readonly e: Tm;
  readonly a: Tm;
  readonly v: Tm;
  readonly t: JsonValue;
}

/** SEAVT semantic readout. E/A/V are the direct closed RMN coordinates. */
export interface SeavtReadout {
  readonly e: Tm;
  readonly a: Tm;
  readonly v: Tm;
  readonly t: JsonValue;
}

export type EntryTuple = readonly [e: JsonValue, a: JsonValue, v: JsonValue, t: JsonValue];
export type SeavtTuple = readonly [e: Tm, a: Tm, v: Tm, t: JsonValue];

export declare function eavtRow(value: unknown): WitnessJournalEntry;

export declare function assertValidEntry(value: unknown): asserts value is WitnessJournalEntry | EntryTuple;
export declare function isEntry(value: unknown): boolean;
export declare function asEntry(row: unknown): WitnessJournalEntry;
export declare function entry(
  subject: JsonValue,
  predicate: JsonValue,
  object: JsonValue,
  time: JsonValue,
  options?: { readonly predicateIsValid?: (predicate: JsonValue) => boolean },
): WitnessJournalEntry;
export declare function sameEntry(left: unknown, right: unknown): boolean;

export declare function assertValidSeavt(value: unknown): asserts value is Seavt | SeavtTuple;
export declare function isSeavt(value: unknown): boolean;
export declare function asSeavt(row: unknown): Seavt;
export declare function seavt(entity: Tm, attribute: Tm, value: Tm, time: JsonValue): Seavt;
export declare function readSeavt(row: unknown): SeavtReadout;
export interface SeavtSemanticMaterial {
  readonly kind: "witness-journal.seavt.semantic-content";
  readonly version: 3;
  readonly coordinates: Pick<Seavt, "e" | "a" | "v">;
  readonly witness: {
    readonly kind: "witness-journal.seavt.time-custody-witness";
    readonly version: 1;
    readonly time: JsonValue;
    readonly custody: JsonValue;
  };
}
export interface SeavtSemanticContentIdentity extends NormalizedSemanticContentIdentity {
  readonly source: Seavt;
  readonly material: SeavtSemanticMaterial;
  readonly witnessIdentity: NormalizedSemanticContentIdentity;
}
export declare function identifySeavtSemanticContent(
  row: unknown,
  custody: JsonValue,
): SeavtSemanticContentIdentity;
