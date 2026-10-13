/** Admit a real absolute observation instant. Date.parse alone can silently
 * normalize impossible calendar dates such as February 30. */
export const isAbsoluteSeavtClock = value => {
  if (typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(value) ||
      !Number.isFinite(Date.parse(value))) return false;
  const day = value.slice(0, 10);
  const midnight = new Date(day + "T00:00:00Z");
  return Number.isFinite(midnight.getTime()) && midnight.toISOString().slice(0, 10) === day;
};

/** Exact order of SEAVT instants, including all fractional-second digits.
 * JS Date.parse is suitable for validating the whole-second calendar and
 * UTC offset, but its millisecond truncation must not define evidence order.
 * Returns -1, 0, or 1. Equal-offset representations denote one instant. */
export function compareAbsoluteSeavtClocks(left, right) {
  if (!isAbsoluteSeavtClock(left) || !isAbsoluteSeavtClock(right))
    throw new TypeError("SEAVT comparison requires two absolute observation instants");
  const withoutFraction = value => value.replace(/\.\d+(?=(?:Z|[+-]\d{2}:\d{2})$)/u, "");
  const a = Date.parse(withoutFraction(left)), b = Date.parse(withoutFraction(right));
  if (a !== b) return a < b ? -1 : 1;
  const digits = value => value.match(/\.(\d+)(?=(?:Z|[+-]\d{2}:\d{2})$)/u)?.[1] ?? "";
  const af = digits(left), bf = digits(right), width = Math.max(af.length, bf.length);
  const ap = af.padEnd(width, "0"), bp = bf.padEnd(width, "0");
  return ap === bp ? 0 : ap < bp ? -1 : 1;
}
