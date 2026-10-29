/** A small, total EAVT engine. Values are JSON; rows are immutable facts. */
import { type Json } from "../../serialized-computer-data-engineering-services-section/services/json-services-section/src/json.mjs";
export type { Json } from "../../serialized-computer-data-engineering-services-section/services/json-services-section/src/json.mjs";
export interface Cell extends Readonly<Record<string, Json>> {
    readonly e: Json;
    readonly a: Json;
    readonly v: Json;
}
export interface Row extends Cell {
    readonly t: Json;
}
export interface AddressedRow extends Row {
    readonly id: string;
}
export interface Store {
    read(path: string): readonly string[];
    append(path: string, line: string): void;
}
export type Request = {
    readonly operation: "validate";
    readonly row: unknown;
} | {
    readonly operation: "encode";
    readonly row: unknown;
} | {
    readonly operation: "decode";
    readonly line: string;
} | {
    readonly operation: "read";
    readonly path: string;
} | {
    readonly operation: "append";
    readonly path: string;
    readonly row: unknown;
} | {
    readonly operation: "entities";
    readonly rows: readonly unknown[];
} | {
    readonly operation: "current";
    readonly rows: readonly unknown[];
} | {
    readonly operation: "latest";
    readonly rows: readonly unknown[];
    readonly attributes: readonly Json[];
} | {
    readonly operation: "relations";
    readonly rows: readonly unknown[];
    readonly attribute: Json;
    readonly value?: Json;
} | {
    readonly operation: "constitute";
    readonly kind: string;
    readonly attributes: Json;
    readonly t: Json;
} | {
    readonly operation: "settle";
    readonly entity: Json;
    readonly rows: readonly unknown[];
} | {
    readonly operation: "filter-consent";
    readonly audience: string;
    readonly rows: readonly unknown[];
} | {
    readonly operation: "relation-nerve";
    readonly attribute: Json;
    readonly rows: readonly unknown[];
};
export declare function row(value: unknown): Row;
/** Canonical JSON is the interchange carrier: one row, one line, one reversible transform. */
export declare const encode: (value: unknown) => string;
export declare function decode(line: string): Row;
export declare const identify: (value: unknown) => string;
export declare const unique: (values: readonly unknown[]) => readonly Row[];
export declare const entities: (values: readonly unknown[]) => readonly Json[];
/** Retain multivalued facts after their latest strictly later cell retraction. */
export declare function current(values: readonly unknown[]): readonly Row[];
/** Pure latest-value lens; only attributes named by the caller are single-valued. */
export declare function latest(values: readonly unknown[], attributes: readonly Json[]): readonly Row[];
export declare const relations: (values: readonly unknown[], attribute: Json, value?: Json) => readonly Row[];
/** A null value retracts its entity/attribute cell; all other rows affirm it. */
export declare function settle(values: readonly unknown[], entity: Json): {
    readonly entity: Json;
    readonly affirmed: readonly Cell[];
    readonly denied: readonly Cell[];
    readonly contradicted: readonly Cell[];
};
export declare function consent(values: readonly unknown[], audience: string): {
    readonly rows: readonly Row[];
    readonly withheld: number;
};
export declare function constitute(kind: string, attributes: Json, t: Json): {
    readonly address: string;
    readonly genesis: Row;
};
export declare function relationNerve(values: readonly unknown[], attribute: Json): {
    readonly vertices: number;
    readonly edges: number;
    readonly components: number;
    readonly cycles: number;
};
export declare function execute(request: Request, store: Store): Json;
