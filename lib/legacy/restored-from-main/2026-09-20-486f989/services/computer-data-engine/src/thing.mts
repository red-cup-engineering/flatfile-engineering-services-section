import { identifyContent } from "./content.mjs";
import { admit, typeIdentity, type DataType, type Result, type TypeValue, type AdmissionRefusal } from "./type-system.mjs";

/** A JSON value suitable for stable content identity and transport. */
export type JsonValue = null | boolean | number | string | readonly JsonValue[] | JsonObject;

/** JSON object attributes carried by a Thing. */
export type JsonObject = Readonly<{ readonly [key: string]: JsonValue }>;

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

const refusal = (kind: ThingInputRefusal["kind"], message: string): Result<never, ThingInputRefusal> => ({
  ok: false,
  refusal: Object.freeze({ kind, message }),
});

const isPlainObject = (value: object): value is Record<string, unknown> => {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const copyJson = (value: unknown, ancestors: Set<object>): JsonValue | undefined => {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "object") return undefined;
  if (ancestors.has(value)) return undefined;

  const nextAncestors = new Set(ancestors);
  nextAncestors.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.values(descriptors).some((descriptor) => !("value" in descriptor))) return undefined;
  if (Array.isArray(value)) {
    const copy: JsonValue[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor || !("value" in descriptor)) return undefined;
      const copied = copyJson(descriptor.value, nextAncestors);
      if (copied === undefined) return undefined;
      copy.push(copied);
    }
    return Object.freeze(copy);
  }
  if (!isPlainObject(value)) return undefined;
  const copy: Record<string, JsonValue> = {};
  for (const key of Object.keys(value)) {
    const descriptor = descriptors[key];
    if (!descriptor || !("value" in descriptor)) return undefined;
    const copied = copyJson(descriptor.value, nextAncestors);
    if (copied === undefined) return undefined;
    Object.defineProperty(copy, key, { value: copied, enumerable: true, writable: false, configurable: false });
  }
  return Object.freeze(copy);
};

/**
 * Creates a Thing from an established data type and an admitted JSON object.
 *
 * Its identity is the RFC 6920 name of canonical CBOR for the established type
 * identity and admitted attributes. It is consequently a content/version identity,
 * not an identifier for a mutable entity through time.
 * Equal typed content therefore produces the same identity across processes, while
 * the returned carrier never retains mutable caller-owned data.
 */
export const makeThing = <Type extends DataType>(input: ThingInput<Type>): Result<Thing<TypeValue<Type> & JsonObject>, ThingRefusal> => {
  let identity: string;
  try { identity = typeIdentity(input.type); }
  catch { return refusal("invalid-thing-type", "Thing type must be an established data type declaration."); }
  const copiedAttributes = copyJson(input.attributes, new Set());
  if (copiedAttributes === undefined || copiedAttributes === null || typeof copiedAttributes !== "object" || Array.isArray(copiedAttributes) || !isPlainObject(copiedAttributes)) {
    return refusal("invalid-thing-attributes", "Thing attributes must be a plain, acyclic object of finite JSON values without accessors.");
  }
  const attributes = copiedAttributes as TypeValue<Type> & JsonObject;
  const admitted = admit(input.type, attributes);
  if (!admitted.ok) return admitted;
  const content = Object.freeze({ type: identity, attributes });
  return {
    ok: true,
    value: Object.freeze({ id: identifyContent(content), type: identity, attributes }),
  };
};
