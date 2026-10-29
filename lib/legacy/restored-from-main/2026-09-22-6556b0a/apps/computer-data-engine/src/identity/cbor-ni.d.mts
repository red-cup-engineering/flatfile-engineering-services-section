/**
 * Name one canonical CBOR byte string.
 *
 * Input: RFC 8949 core-deterministic CBOR bytes representing already-admitted
 * application material. Output: the RFC 6920 SHA-256 `ni:` URI for those exact
 * bytes. It deliberately does not admit a term, normalize a carrier, or encode
 * CBOR; those are separate transformations.
 */
export function canonicalCborToNiUri(bytes: any): string;
/**
 * Names the canonical CBOR encoding of an admitted carrier value with its ni: URI.
 * @param {{value: unknown}} request
 * @returns {{uri: string}}
 */
export function deriveCborNi(request: {
    value: unknown;
}): {
    uri: string;
};
