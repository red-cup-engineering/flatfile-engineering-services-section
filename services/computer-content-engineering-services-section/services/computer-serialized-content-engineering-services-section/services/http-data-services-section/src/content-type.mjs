import { firstHeader, quoteHeaderValue, splitHeaderParameters, unquoteHeaderValue } from "./header-value.mjs";
export function parseContentType(value) {
    const raw = firstHeader(value)?.trim();
    if (!raw) return null;
    const parts = splitHeaderParameters(raw);
    const type = (parts.shift() ?? "").trim().toLowerCase();
    if (!type) return null;
    const params = {};
    for (const part of parts){
        const eq = part.indexOf("=");
        if (eq <= 0) continue;
        const key = part.slice(0, eq).trim().toLowerCase();
        if (!key) continue;
        params[key] = unquoteHeaderValue(part.slice(eq + 1).trim());
    }
    return Object.freeze({
        type,
        params: Object.freeze(params)
    });
}
const TOKEN_RE = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
export function serializeContentType(contentType) {
    const params = Object.entries(contentType.params).map(([key, value])=>`${key}=${TOKEN_RE.test(value) ? value : quoteHeaderValue(value)}`);
    return [
        contentType.type,
        ...params
    ].join("; ");
}
