import { readHttpDate, formatHttpDateParts } from "./date.mjs";

function request(body, required, optional = []) {
    if (!body || typeof body !== "object" || Array.isArray(body) || required.some(k => !Object.hasOwn(body, k)) || Object.keys(body).some(k => !required.includes(k) && !optional.includes(k))) throw new TypeError(`request requires ${required.join(", ")}; optional ${optional.join(", ")}`);
}
export function httpDateToJson(body) {
    request(body, ["date"], ["referenceUnixMilliseconds"]);
    if (Object.hasOwn(body, "referenceUnixMilliseconds") && !Number.isSafeInteger(body.referenceUnixMilliseconds)) throw new TypeError("referenceUnixMilliseconds must be a safe integer");
    return readHttpDate(body.date, body);
}
export function jsonToHttpDate(body) {
    request(body, ["year", "month", "day", "hour", "minute", "second"]);
    // The same receiving parser checks the formatter's UTC output, retaining
    // leap-second notation without fabricating a POSIX millisecond instant.
    return readHttpDate(formatHttpDateParts(body));
}
