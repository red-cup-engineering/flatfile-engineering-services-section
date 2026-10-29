/**
 * Represent each Uint8Array in a JavaScript value as
 * {"$bytes":"<base64url>"}. Arrays and own enumerable object entries are
 * traversed recursively; scalar values are unchanged.
 */
export declare function jsonByteCarrierValue(value: unknown): unknown;
/**
 * Deterministically serialize a JavaScript value after representing each
 * Uint8Array as {"$bytes":"<base64url>"}.
 *
 * The JSON codec owns JSON admission and ordering; this adapter owns only the
 * byte representation.
 */
export declare function canonicalJsonByteCarrier(value: unknown): string;
export declare function encodeJsonByteCarrier(bytes: Uint8Array, { mediaType }?: {
    mediaType?: string;
}): Readonly<{
    mediaType: string;
    contentBase64: string;
}>;
export declare function decodeJsonByteCarrier(carrier: unknown, { expectedMediaType, maximumBytes }?: {
    expectedMediaType?: string;
    maximumBytes?: number;
}): Readonly<{
    mediaType: string;
    bytes: Buffer;
}>;
