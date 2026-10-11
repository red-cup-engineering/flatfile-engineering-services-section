import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { admit, typeIdentity } from "./type-system.mjs";
const refusal = (kind, message) => ({
    ok: false,
    refusal: Object.freeze({ kind, message }),
});
const isPlainObject = (value) => {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
};
const copyJson = (value, ancestors) => {
    if (value === null || typeof value === "string" || typeof value === "boolean")
        return value;
    if (typeof value === "number")
        return Number.isFinite(value) ? value : undefined;
    if (typeof value !== "object")
        return undefined;
    if (ancestors.has(value))
        return undefined;
    const nextAncestors = new Set(ancestors);
    nextAncestors.add(value);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Object.values(descriptors).some((descriptor) => !("value" in descriptor)))
        return undefined;
    if (Array.isArray(value)) {
        const copy = [];
        for (let index = 0; index < value.length; index += 1) {
            const descriptor = descriptors[String(index)];
            if (!descriptor || !("value" in descriptor))
                return undefined;
            const copied = copyJson(descriptor.value, nextAncestors);
            if (copied === undefined)
                return undefined;
            copy.push(copied);
        }
        return Object.freeze(copy);
    }
    if (!isPlainObject(value))
        return undefined;
    const copy = {};
    for (const key of Object.keys(value)) {
        const descriptor = descriptors[key];
        if (!descriptor || !("value" in descriptor))
            return undefined;
        const copied = copyJson(descriptor.value, nextAncestors);
        if (copied === undefined)
            return undefined;
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
export const makeThing = (input) => {
    let identity;
    try {
        identity = typeIdentity(input.type);
    }
    catch {
        return refusal("invalid-thing-type", "Thing type must be an established data type declaration.");
    }
    const copiedAttributes = copyJson(input.attributes, new Set());
    if (copiedAttributes === undefined || copiedAttributes === null || typeof copiedAttributes !== "object" || Array.isArray(copiedAttributes) || !isPlainObject(copiedAttributes)) {
        return refusal("invalid-thing-attributes", "Thing attributes must be a plain, acyclic object of finite JSON values without accessors.");
    }
    const attributes = copiedAttributes;
    const admitted = admit(input.type, attributes);
    if (!admitted.ok)
        return admitted;
    const content = Object.freeze({ type: identity, attributes });
    return {
        ok: true,
        value: Object.freeze({ id: semanticId(content), type: identity, attributes }),
    };
};
