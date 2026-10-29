import type { JsonValue } from "../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import type { WitnessJournalEntry } from "./row.mjs";

export type SettledDatom = readonly [e: JsonValue, a: JsonValue, v: JsonValue, t: JsonValue, reading: JsonValue];
export function settledDatom(row: unknown, readingValue: JsonValue): SettledDatom;
export function settle(rows: readonly unknown[], judge: (entry: WitnessJournalEntry) => JsonValue | undefined): Readonly<{ datoms: readonly SettledDatom[]; kept: readonly WitnessJournalEntry[] }>;
export function recordPathFor(root: string, feed: string, at: JsonValue): string;
export function readDatomsAtPath(filePath: string): SettledDatom[];
export function commitSettledRecord(root: string, feed: string, settlement: Readonly<{ datoms: readonly SettledDatom[]; kept: readonly unknown[]; at: JsonValue }>): Readonly<{ recordPath: string; logPath: string }> | undefined;
