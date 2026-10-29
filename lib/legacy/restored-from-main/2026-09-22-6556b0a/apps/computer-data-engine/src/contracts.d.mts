import type { FromJsonSchema } from "./schema.mjs";
export type JsonValue = null | boolean | number | string | readonly JsonValue[] | {
    readonly [key: string]: JsonValue;
};
export type JsonRecord = {
    readonly [key: string]: JsonValue;
};
export type SchemaAddress = string;
/** A Node schema contract: address plus schema/validator projections of admissible material. */
export interface SchemaContract<T = unknown> {
    readonly kind: "schema-contract";
    readonly id: SchemaAddress;
    readonly schema: JsonRecord & {
        readonly $id: SchemaAddress;
    };
    readonly references: readonly SchemaContract[];
    readonly validate: (value: unknown) => value is T;
    readonly assert: (value: unknown, context?: string) => T;
    readonly errors: (value: unknown) => readonly string[];
}
export declare const SchemaContractSchema: {
    readonly $id: "computer-data/schema-contract";
    readonly type: "object";
    readonly required: readonly ["kind", "id", "schema"];
    readonly properties: {
        readonly kind: {
            readonly const: "schema-contract";
        };
        readonly id: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly schema: {};
    };
    readonly title: "SchemaContract";
    readonly description: "A category object declared by one JSON-Schema literal and its validator.";
    readonly additionalProperties: false;
};
export type SchemaContractMaterial = FromJsonSchema<typeof SchemaContractSchema>;
/** Compatibility name for data declared from plain JSON-Schema literals. */
export type DataSchema<T> = SchemaContract<T>;
/**
 * Declare a schema contract from a plain JSON-Schema literal and explicitly composed references.
 *
 * @param schema Schema carrying its composition address.
 * @param references Cross-schema contracts available to `$ref`.
 * @returns A pure domain wrapper over the shared standards evaluator.
 */
export declare function schemaFrom<const S extends {
    readonly $id: string;
}>(schema: S, references?: readonly SchemaContract[]): SchemaContract<FromJsonSchema<S>>;
