const NAME_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const FIELD_VALUE_RE = /^[\u0021\u0023-\u002B\u002D-\u003A\u003C-\u005B\u005D-\u007E]*$/;
export const isCookieName = (name)=>NAME_RE.test(name);
export function assertCookieName(name) {
    if (!isCookieName(name)) throw new TypeError(`invalid cookie name: ${JSON.stringify(name)}`);
}
export const isFieldValue = (value)=>FIELD_VALUE_RE.test(value);
export function decodeCookieValue(value) {
    try {
        return decodeURIComponent(value);
    } catch  {
        return value;
    }
}
export function parseCookieHeader(header) {
    if (!header) return Object.freeze({});
    const raw = typeof header === "string" ? header : header.join("; ");
    const cookies = {};
    for (const part of raw.split(";")){
        const trimmed = part.trim();
        if (!trimmed) continue;
        const equals = trimmed.indexOf("=");
        if (equals <= 0) continue;
        const name = trimmed.slice(0, equals).trim();
        if (!isCookieName(name) || Object.hasOwn(cookies, name)) continue;
        cookies[name] = decodeCookieValue(trimmed.slice(equals + 1).trim());
    }
    return Object.freeze(cookies);
}
export function serializeCookieHeader(cookies, encode = encodeURIComponent) {
    const parts = [];
    for (const [name, value] of Object.entries(cookies)){
        assertCookieName(name);
        const encoded = encode(value);
        if (!isFieldValue(encoded)) throw new TypeError(`encoded cookie value for ${name} contains invalid characters`);
        parts.push(`${name}=${encoded}`);
    }
    return parts.join("; ");
}
export function serializeSetCookie(name, value, options = {}) {
    assertCookieName(name);
    const encode = options.encode ?? encodeURIComponent;
    const encoded = encode(value);
    if (!isFieldValue(encoded)) throw new TypeError(`serializeSetCookie: encoded value for ${name} contains invalid characters`);
    const parts = [
        `${name}=${encoded}`
    ];
    if (options.maxAge !== undefined) {
        if (!Number.isFinite(options.maxAge)) throw new TypeError("serializeSetCookie: maxAge must be finite");
        parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
    }
    if (options.domain !== undefined) parts.push(`Domain=${validAttributeValue("domain", options.domain)}`);
    if (options.path !== undefined) parts.push(`Path=${validAttributeValue("path", options.path)}`);
    if (options.expires !== undefined) {
        if (!Number.isFinite(options.expires.getTime())) throw new TypeError("serializeSetCookie: expires must be a valid Date");
        parts.push(`Expires=${options.expires.toUTCString()}`);
    }
    if (options.httpOnly) parts.push("HttpOnly");
    if (options.secure) parts.push("Secure");
    if (options.sameSite !== undefined && options.sameSite !== false) parts.push(`SameSite=${sameSiteValue(options.sameSite)}`);
    if (options.priority !== undefined) parts.push(`Priority=${priorityValue(options.priority)}`);
    if (options.partitioned) parts.push("Partitioned");
    return parts.join("; ");
}
export function parseSetCookie(text) {
    const [pair = "", ...attributes] = text.split(";");
    const equals = pair.indexOf("=");
    if (equals <= 0) return null;
    const name = pair.slice(0, equals).trim();
    if (!isCookieName(name)) return null;
    const cookie = {
        name,
        value: decodeCookieValue(pair.slice(equals + 1).trim()),
        httpOnly: false,
        secure: false,
        partitioned: false
    };
    for (const attribute of attributes){
        const split = attribute.indexOf("=");
        const key = (split === -1 ? attribute : attribute.slice(0, split)).trim().toLowerCase();
        const value = split === -1 ? "" : attribute.slice(split + 1).trim();
        switch(key){
            case "domain":
                if (value) cookie.domain = value;
                break;
            case "path":
                if (value) cookie.path = value;
                break;
            case "expires":
                {
                    const date = new Date(value);
                    if (Number.isFinite(date.getTime())) cookie.expires = date;
                    break;
                }
            case "max-age":
                {
                    const age = Number(value);
                    if (Number.isFinite(age)) cookie.maxAge = age;
                    break;
                }
            case "httponly":
                cookie.httpOnly = true;
                break;
            case "secure":
                cookie.secure = true;
                break;
            case "samesite":
                {
                    const normalized = value.toLowerCase();
                    if (normalized === "strict") cookie.sameSite = "Strict";
                    else if (normalized === "lax") cookie.sameSite = "Lax";
                    else if (normalized === "none") cookie.sameSite = "None";
                    break;
                }
            case "priority":
                {
                    const normalized = value.toLowerCase();
                    if (normalized === "low") cookie.priority = "Low";
                    else if (normalized === "medium") cookie.priority = "Medium";
                    else if (normalized === "high") cookie.priority = "High";
                    break;
                }
            case "partitioned":
                cookie.partitioned = true;
                break;
            default:
                break;
        }
    }
    return Object.freeze(cookie);
}
function validAttributeValue(name, value) {
    if (!isFieldValue(value)) throw new TypeError(`serializeSetCookie: ${name} contains invalid characters`);
    return value;
}
function sameSiteValue(value) {
    if (value === true) return "Strict";
    const normalized = value.toLowerCase();
    if (normalized === "strict") return "Strict";
    if (normalized === "lax") return "Lax";
    if (normalized === "none") return "None";
    throw new TypeError("serializeSetCookie: sameSite must be Strict, Lax, or None");
}
function priorityValue(value) {
    const normalized = value.toLowerCase();
    if (normalized === "low") return "Low";
    if (normalized === "medium") return "Medium";
    if (normalized === "high") return "High";
    throw new TypeError("serializeSetCookie: priority must be Low, Medium, or High");
}
// A client's cookie jar is a list of stored cookies { name, value, domain, path,
// expires (seconds since the epoch, -1 for a session cookie), secure, hostOnly }
// in the shape a browser's storage state keeps them (RFC 6265 section 5.3).
function domainMatches(host, cookie) {
    const domain = cookie.domain.replace(/^\./, "").toLowerCase();
    if (cookie.hostOnly === true || (cookie.hostOnly === undefined && !cookie.domain.startsWith("."))) return host === domain;
    return host === domain || host.endsWith(`.${domain}`);
}
function pathMatches(path, cookiePath = "/") {
    return path === cookiePath || path.startsWith(cookiePath.endsWith("/") ? cookiePath : `${cookiePath}/`);
}
/** The Cookie header a jar sends to one URL: live, domain- and path-matched cookies, longest path first. */
export function jarCookieHeader(jar, url, now = Date.now() / 1000) {
    const target = new URL(url);
    const host = target.hostname.toLowerCase();
    return jar.filter((cookie)=>domainMatches(host, cookie) && pathMatches(target.pathname, cookie.path) && (!cookie.secure || target.protocol === "https:") && !(cookie.expires > 0 && cookie.expires <= now)).sort((a, b)=>(b.path ?? "/").length - (a.path ?? "/").length).map((cookie)=>`${cookie.name}=${cookie.value}`).join("; ");
}
/** The jar after one response's Set-Cookie lines from url: replaced by name, domain and path; expired ones removed. */
export function applySetCookies(jar, setCookieLines, url, now = Date.now() / 1000) {
    const origin = new URL(url);
    let next = jar;
    for (const line of setCookieLines){
        const parsed = parseSetCookie(line);
        if (parsed === null) continue;
        const domain = parsed.domain ? `.${parsed.domain.replace(/^\./, "").toLowerCase()}` : origin.hostname.toLowerCase();
        if (parsed.domain && !domainMatches(origin.hostname.toLowerCase(), { domain, hostOnly: false })) continue;
        const path = parsed.path ?? (origin.pathname.slice(0, origin.pathname.lastIndexOf("/")) || "/");
        const expires = parsed.maxAge !== undefined ? now + parsed.maxAge : parsed.expires ? parsed.expires.getTime() / 1000 : -1;
        next = next.filter((cookie)=>!(cookie.name === parsed.name && cookie.domain === domain && (cookie.path ?? "/") === path));
        if (expires === -1 || expires > now) next = [...next, { name: parsed.name, value: parsed.value, domain, path, expires, secure: parsed.secure, httpOnly: parsed.httpOnly, hostOnly: !parsed.domain }];
    }
    return next;
}
