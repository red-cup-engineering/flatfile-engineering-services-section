/** The identity operations as request-to-result functions; each is a face of one primitive above. */
/** @param {{bytesBase64?: string, text?: string, algorithm?: string}} request @returns {{uri: string}} */
export function makeNiUriService(request: {
    bytesBase64?: string;
    text?: string;
    algorithm?: string;
}): {
    uri: string;
};
/** @param {{uri: string}} request @returns {{algorithm: "sha-256", digest: string}} */
export function parseNiUri(request: {
    uri: string;
}): {
    algorithm: "sha-256";
    digest: string;
};
/** @param {{value: unknown}} request @returns {{base64: string}} */
export function encodeCbor(request: {
    value: unknown;
}): {
    base64: string;
};
/** @param {{base64: string}} request @returns {{value: unknown}} */
export function decodeCbor(request: {
    base64: string;
}): {
    value: unknown;
};
/** @param {{value: unknown}} request @returns {{text: string}} */
export function canonicalizeJson(request: {
    value: unknown;
}): {
    text: string;
};
