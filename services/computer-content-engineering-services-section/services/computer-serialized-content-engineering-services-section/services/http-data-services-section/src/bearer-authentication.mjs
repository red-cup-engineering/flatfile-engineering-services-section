import { quoteHeaderValue } from "./header-value.mjs";
function first(value) {
    return typeof value === "string" ? value : value?.[0];
}
export function bearerToken(authorization) {
    const raw = first(authorization);
    const match = /^Bearer\s+(.+)$/i.exec(raw ?? "");
    return match?.[1]?.trim() || undefined;
}
export function bearerChallenge(options = {}) {
    const parts = [];
    if (options.realm !== undefined) parts.push(`realm=${quoteHeaderValue(options.realm)}`);
    if (options.error !== undefined) parts.push(`error=${quoteHeaderValue(options.error)}`);
    if (options.errorDescription !== undefined) {
        parts.push(`error_description=${quoteHeaderValue(options.errorDescription)}`);
    }
    if (options.errorUri !== undefined) parts.push(`error_uri=${quoteHeaderValue(options.errorUri)}`);
    if (options.resourceMetadata !== undefined) {
        parts.push(`resource_metadata=${quoteHeaderValue(options.resourceMetadata)}`);
    }
    return parts.length === 0 ? "Bearer" : `Bearer ${parts.join(", ")}`;
}
