import type { JsonValue } from "../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
export interface WitnessCell { readonly e: JsonValue; readonly a: JsonValue; readonly value: JsonValue; readonly time: JsonValue; }
export declare function latestPerCell(entries: readonly { readonly e: JsonValue; readonly a: JsonValue; readonly v: JsonValue; readonly t: JsonValue; }[]): Readonly<Record<string, WitnessCell>>;
export declare function situationWindow(entries: readonly unknown[], situation?: { readonly since?: JsonValue; readonly until?: JsonValue; readonly filter?: (row: any) => boolean }): readonly unknown[];
export declare function reading(entries: readonly unknown[], situation?: { readonly since?: JsonValue; readonly until?: JsonValue; readonly filter?: (row: any) => boolean }): Readonly<Record<string, unknown>>;
