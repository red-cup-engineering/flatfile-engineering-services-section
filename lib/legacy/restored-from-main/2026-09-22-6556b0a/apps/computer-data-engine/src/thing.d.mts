import { type DataType, type Result, type TypeValue, type AdmissionRefusal } from "./type-system.mjs";
/** A JSON value suitable for stable content identity and transport. */
export type JsonValue = null | boolean | number | string | readonly JsonValue[] | JsonObject;
/** JSON object attributes carried by a Thing. */
export type JsonObject = Readonly<{
    readonly [key: string]: JsonValue;
}>;
/** The input to the sole generic Thing creation operation. */
export type ThingInput<Type extends DataType = DataType> = Readonly<{
    readonly type: Type;
    readonly attributes: TypeValue<Type>;
}>;
/** A distinguishable, immutable typed carrier with a content-derived identity. */
export type Thing<Attributes extends JsonObject = JsonObject> = Readonly<{
    readonly id: string;
    /** Immutable content identity of the established DataType that admitted attributes. */
    readonly type: string;
    readonly attributes: Attributes;
}>;
export type ThingInputRefusal = Readonly<{
    readonly kind: "invalid-thing-type" | "invalid-thing-attributes";
    readonly message: string;
}>;
export type ThingRefusal = ThingInputRefusal | AdmissionRefusal;
/**
 * Creates a Thing from an established data type and an admitted JSON object.
 *
 * Its identity is the RFC 6920 name of canonical CBOR for the established type
 * identity and admitted attributes. It is consequently a content/version identity,
 * not an identifier for a mutable entity through time.
 * Equal typed content therefore produces the same identity across processes, while
 * the returned carrier never retains mutable caller-owned data.
 */
export declare const makeThing: <Type extends DataType>(input: ThingInput<Type>) => Result<Thing<TypeValue<Type> & JsonObject>, ThingRefusal>;
