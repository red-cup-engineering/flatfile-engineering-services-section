import { createHmac, timingSafeEqual } from "node:crypto";
export function signCookieValue(value, secret, salt = "cookie") {
    if (!secret) throw new TypeError("signCookieValue: secret is required");
    const signature = createHmac("sha256", secret).update(salt).update("\0").update(value).digest("base64url");
    return `${value}.${signature}`;
}
export function unsignCookieValue(signedValue, secret, salt = "cookie") {
    const marker = signedValue.lastIndexOf(".");
    if (marker <= 0) return null;
    const value = signedValue.slice(0, marker);
    const signature = signedValue.slice(marker + 1);
    const expected = signCookieValue(value, secret, salt).slice(value.length + 1);
    return safeEqual(signature, expected) ? value : null;
}
function safeEqual(left, right) {
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && timingSafeEqual(a, b);
}
