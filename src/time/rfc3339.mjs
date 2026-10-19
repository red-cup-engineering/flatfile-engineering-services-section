/**
 * A pure reader of RFC 3339 section 5.6 timestamp carriers, including the
 * RFC 9557 unknown-local-offset update. Invalid source data stays unknown.
 * Leap second :60 needs an authoritative dated schedule; this exact-instant
 * subset refuses it instead of silently normalizing it.
 * Fractional seconds are compared exactly, not coerced to milliseconds.
 */
const STAMP = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?([Zz]|[+-]\d{2}:\d{2})$/u;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;
const leap = year => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
const days = (year, month) => month === 2 ? (leap(year) ? 29 : 28)
  : [4, 6, 9, 11].includes(month) ? 30 : 31;

/** True precisely for existing proleptic-Gregorian YYYY-MM-DD dates. */
export function isIsoCalendarDate(value) {
  const parts = typeof value === "string" ? DATE.exec(value) : null;
  if (!parts) return false;
  const year = Number(parts[1]), month = Number(parts[2]), day = Number(parts[3]);
  return month >= 1 && month <= 12 && day >= 1 && day <= days(year, month);
}

/** Parsed whole UTC seconds and lossless fractional digits, or null on refusal. */
export function parseRfc3339Instant(value) {
  const parts = typeof value === "string" ? STAMP.exec(value) : null;
  if (!parts || !isIsoCalendarDate([parts[1], parts[2], parts[3]].join("-"))) return null;
  const [, year, month, day, hour, minute, second, fraction = "", offset] = parts;
  const h = Number(hour), m = Number(minute), s = Number(second);
  if (h > 23 || m > 59 || s > 59) return null;
  const oh = offset.length === 1 ? 0 : Number(offset.slice(1, 3));
  const om = offset.length === 1 ? 0 : Number(offset.slice(4, 6));
  if (oh > 23 || om > 59) return null;
  const delta = offset.length === 1 ? 0
    : (offset[0] === "+" ? 1 : -1) * (oh * 3600 + om * 60);
  // Date.UTC maps years 0..99 to 1900..1999, so set the actual full year.
  const date = new Date(0);
  date.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  date.setUTCHours(h, m, s, 0);
  const epochSecond = date.getTime() / 1000 - delta;
  if (!Number.isSafeInteger(epochSecond)) return null;
  return Object.freeze({ epochSecond, fractionalSecond: fraction.replace(/0+$/u, ""), offset });
}

/** Exact chronological ordering: -1, 0, 1, or null when either source is invalid. */
export function compareRfc3339Instants(left, right) {
  const a = parseRfc3339Instant(left), b = parseRfc3339Instant(right);
  if (!a || !b) return null;
  if (a.epochSecond !== b.epochSecond) return a.epochSecond < b.epochSecond ? -1 : 1;
  const n = Math.max(a.fractionalSecond.length, b.fractionalSecond.length);
  for (let i = 0; i < n; i += 1) {
    const digitA = i < a.fractionalSecond.length ? a.fractionalSecond.charCodeAt(i) : 48;
    const digitB = i < b.fractionalSecond.length ? b.fractionalSecond.charCodeAt(i) : 48;
    if (digitA !== digitB) return digitA < digitB ? -1 : 1;
  }
  return 0;
}
