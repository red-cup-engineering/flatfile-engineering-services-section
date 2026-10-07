export function firstHeader(value) {
    return Array.isArray(value) ? value[0] : value;
}
export function joinedHeader(value) {
    return Array.isArray(value) ? value.join(",") : value == null ? "" : String(value);
}
export function splitHeaderList(value, separator = ",") {
    const out = [];
    let current = "";
    let quoted = false;
    let escaped = false;
    for (const char of value){
        if (escaped) {
            current += char;
            escaped = false;
            continue;
        }
        if (char === "\\" && quoted) {
            current += char;
            escaped = true;
            continue;
        }
        if (char === "\"") quoted = !quoted;
        if (char === separator && !quoted) {
            out.push(current);
            current = "";
            continue;
        }
        current += char;
    }
    out.push(current);
    return out.map((part)=>part.trim()).filter(Boolean);
}
export function unquoteHeaderValue(value) {
    if (value.length >= 2 && value.startsWith("\"") && value.endsWith("\"")) {
        return value.slice(1, -1).replace(/\\(["\\])/g, "$1");
    }
    return value;
}
export function quoteHeaderValue(value) {
    return `"${value.replace(/([\\"])/g, "\\$1")}"`;
}
export function parseDirectiveList(value) {
    const directives = {};
    for (const part of splitHeaderList(joinedHeader(value))){
        const item = part.trim();
        if (!item) continue;
        const eq = item.indexOf("=");
        if (eq === -1) {
            directives[item.toLowerCase()] = true;
        } else {
            directives[item.slice(0, eq).trim().toLowerCase()] = unquoteHeaderValue(item.slice(eq + 1).trim());
        }
    }
    return directives;
}

export function splitHeaderParameters(value) {
    return splitHeaderList(value, ";");
}
