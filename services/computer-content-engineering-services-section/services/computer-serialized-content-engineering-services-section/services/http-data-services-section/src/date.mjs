// RFC 9110 §5.6.7, with RFC 5322 §3.3 calendar semantics. A UTC field
// carrier preserves :60; JavaScript Date cannot represent a leap second.
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const longDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const imf = /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat), (\d{2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d{2}):(\d{2}):(\d{2}) GMT$/u;
const rfc850 = /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday), (\d{2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2}) (\d{2}):(\d{2}):(\d{2}) GMT$/u;
const asctime = /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{2}| \d) (\d{2}):(\d{2}):(\d{2}) (\d{4})$/u;
const insensitive = pattern => new RegExp(pattern.source, "iu");
const imfInsensitive = insensitive(imf), rfc850Insensitive = insensitive(rfc850), asctimeInsensitive = insensitive(asctime);
const index = (names, value) => names.findIndex(name => name.toLowerCase() === value.toLowerCase());
const pad = n => String(n).padStart(2, "0");
const fields = ["year", "month", "day", "hour", "minute", "second"];

function calendar(parts) {
    if (fields.some(k => !Number.isInteger(parts[k])) || parts.year < 1900 || parts.year > 9999 || parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.day > 31 || parts.hour < 0 || parts.hour > 23 || parts.minute < 0 || parts.minute > 59 || parts.second < 0 || parts.second > 60 || (parts.second === 60 && (parts.hour !== 23 || parts.minute !== 59))) throw new TypeError("invalid HTTP UTC calendar fields (years 1900–9999; :60 only at 23:59)");
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, Math.min(parts.second, 59)));
    if (date.getUTCFullYear() !== parts.year || date.getUTCMonth() + 1 !== parts.month || date.getUTCDate() !== parts.day) throw new TypeError("HTTP date has an impossible calendar day");
    return date;
}
export function formatHttpDateParts(parts) {
    const date = calendar(parts);
    return `${days[date.getUTCDay()]}, ${pad(parts.day)} ${months[parts.month - 1]} ${parts.year} ${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)} GMT`;
}
export function httpDateParts(when) {
    const date = new Date(when);
    if (Number.isNaN(date.getTime())) throw new TypeError("invalid UTC instant");
    const parts = { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(), hour: date.getUTCHours(), minute: date.getUTCMinutes(), second: date.getUTCSeconds() };
    calendar(parts);
    return parts;
}
function laterThan(a, b) {
    for (const k of fields) { if (a[k] !== b[k]) return a[k] > b[k]; }
    return false;
}
export function readHttpDate(value, { referenceUnixMilliseconds, caseInsensitive = false } = {}) {
    if (typeof value !== "string" || value.length > 33 || /[^\x20-\x7e]/u.test(value)) throw new TypeError("HTTP date must be one bounded case-sensitive field value");
    let match = (caseInsensitive ? imfInsensitive : imf).exec(value), format = "IMF-fixdate", weekday, parts;
    if (match) {
        weekday = index(days, match[1]);
        parts = { year: +match[4], month: index(months, match[3]) + 1, day: +match[2], hour: +match[5], minute: +match[6], second: +match[7] };
    } else if ((match = (caseInsensitive ? rfc850Insensitive : rfc850).exec(value))) {
        format = "rfc850-date";
        if (!Number.isSafeInteger(referenceUnixMilliseconds)) throw new TypeError("rfc850-date requires explicit referenceUnixMilliseconds for the rolling 50-year rule");
        const reference = httpDateParts(referenceUnixMilliseconds);
        const limitYear = reference.year + 50;
        const limitDay = Math.min(reference.day, new Date(Date.UTC(limitYear, reference.month, 0)).getUTCDate());
        const limit = { ...reference, year: limitYear, day: limitDay };
        weekday = index(longDays, match[1]);
        parts = { year: Math.floor(limitYear / 100) * 100 + +match[4], month: index(months, match[3]) + 1, day: +match[2], hour: +match[5], minute: +match[6], second: +match[7] };
        if (laterThan(parts, limit)) parts.year -= 100;
    } else if ((match = (caseInsensitive ? asctimeInsensitive : asctime).exec(value))) {
        format = "asctime-date";
        weekday = index(days, match[1]);
        parts = { year: +match[7], month: index(months, match[2]) + 1, day: +match[3], hour: +match[4], minute: +match[5], second: +match[6] };
    } else throw new TypeError("not an RFC 9110 HTTP-date");
    const date = calendar(parts);
    if (date.getUTCDay() !== weekday) throw new TypeError("HTTP weekday contradicts its calendar date");
    return { format, ...parts, weekday: days[weekday], httpDate: formatHttpDateParts(parts), leapSecond: parts.second === 60, unixMilliseconds: parts.second === 60 ? null : date.getTime() };
}
export function httpDate(when = new Date()) {
    return formatHttpDateParts(httpDateParts(when));
}
/** Date-carrier reader: null also means a valid leap second has no JS Date. */
export function parseHttpDate(value, { referenceUnixMilliseconds = Date.now(), caseInsensitive = false } = {}) {
    try {
        const result = readHttpDate(value, { referenceUnixMilliseconds, caseInsensitive });
        return result.unixMilliseconds === null ? null : new Date(result.unixMilliseconds);
    } catch (error) { if (error instanceof TypeError) return null; throw error; }
}
