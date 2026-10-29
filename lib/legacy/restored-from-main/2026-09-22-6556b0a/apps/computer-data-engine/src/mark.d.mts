/** Opaque present datum. Payload interpretation belongs to the selected type or codec. */
export declare const MarkSchema: {
    readonly type: "object";
    readonly required: readonly ["kind", "value"];
    readonly properties: {
        readonly kind: {
            readonly const: "utterance.mark";
        };
        readonly value: {};
    };
    readonly additionalProperties: false;
};
/** The common Mark admission contract; specialize its value for an interpreted datum. */
export declare const MarkType: Readonly<{
    id: string;
    name: string;
    description: string;
    schema: {
        readonly type: "object";
        readonly required: readonly ["kind", "value"];
        readonly properties: {
            readonly kind: {
                readonly const: "utterance.mark";
            };
            readonly value: {};
        };
        readonly additionalProperties: false;
    };
    references: readonly import("./validation.mjs").JsonSchema[];
    parentIds: readonly string[];
    parents: readonly import("./type-system.mjs").DataType[];
    readonly __value?: {
        readonly kind: "utterance.mark";
        readonly value: unknown;
    } | undefined;
}>;
export declare class Mark<T = unknown> {
    readonly kind: "utterance.mark";
    readonly value: T;
    constructor(value: T);
}
export declare function mark<T>(value: T): Mark<T>;

export declare function coincides(left: unknown, right: unknown): boolean;
export declare function isMark(value: unknown): value is Mark;
