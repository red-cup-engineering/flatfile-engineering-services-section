import { canonical, requireJsonValue } from "./json.mjs";
const FIELDS = Object.freeze(["contentBase64", "mediaType"]);
function requiredMediaType(value) {
    if (typeof value !== "string" || value.length === 0 || value.trim() !== value)
        throw new TypeError("JSON byte carrier mediaType must be nonempty trimmed text");
    return value;
}
/**
 * Represent each Uint8Array in a JavaScript value as
 * {"$bytes":"<base64url>"}. Arrays and own enumerable object entries are
 * traversed recursively; scalar values are unchanged.
 */
export function jsonByteCarrierValue(value) {
    if (value instanceof Uint8Array)
        return { $bytes: Buffer.from(value).toString("base64url") };
    if (Array.isArray(value))
        return value.map(jsonByteCarrierValue);
    if (value && typeof value === "object")
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonByteCarrierValue(item)]));
    return value;
}
/**
 * Deterministically serialize a JavaScript value after representing each
 * Uint8Array as {"$bytes":"<base64url>"}.
 *
 * The JSON codec owns JSON admission and ordering; this adapter owns only the
 * byte representation.
 */
export function canonicalJsonByteCarrier(value) {
    return canonical(requireJsonValue(jsonByteCarrierValue(value), "JSON byte carrier"));
}
export function encodeJsonByteCarrier(bytes, { mediaType = "application/octet-stream" } = {}) {
    if (!(bytes instanceof Uint8Array))
        throw new TypeError("JSON byte carrier input must be a Uint8Array");
    return Object.freeze({ mediaType: requiredMediaType(mediaType), contentBase64: Buffer.from(bytes).toString("base64") });
}
export function decodeJsonByteCarrier(carrier, { expectedMediaType, maximumBytes = Number.MAX_SAFE_INTEGER } = {}) {
    if (carrier === null || typeof carrier !== "object" || Array.isArray(carrier) || Object.getPrototypeOf(carrier) !== Object.prototype)
        throw new TypeError("JSON byte carrier must be one plain object");
    const record = carrier;
    const fields = Object.keys(record).sort();
    if (fields.length !== FIELDS.length || fields.some((field, index) => field !== FIELDS[index]))
        throw new TypeError("JSON byte carrier must contain exactly mediaType and contentBase64");
    const mediaType = requiredMediaType(record.mediaType);
    if (expectedMediaType !== undefined && mediaType !== expectedMediaType)
        throw new TypeError(`JSON byte carrier mediaType must be ${expectedMediaType}`);
    if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0)
        throw new TypeError("JSON byte carrier maximumBytes must be a nonnegative safe integer");
    if (typeof record.contentBase64 !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(record.contentBase64))
        throw new TypeError("JSON byte carrier contentBase64 must be canonical Base64");
    const bytes = Buffer.from(record.contentBase64, "base64");
    if (bytes.toString("base64") !== record.contentBase64)
        throw new TypeError("JSON byte carrier contentBase64 must reproduce canonical Base64");
    if (bytes.length > maximumBytes)
        throw new RangeError(`JSON byte carrier exceeds ${maximumBytes} bytes`);
    return Object.freeze({ mediaType, bytes });
}
