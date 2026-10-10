const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const extensionPattern = /^[a-z0-9]+(?:\.[a-z0-9]+)*$/u;

function measureDate(date) {
  if (date === null) return Object.freeze({ precision: "undated", year: null, month: null, day: null });
  if (typeof date !== "string") throw new TypeError("date must be a reduced-precision string or null");
  let match = date.match(/^([1-9][0-9]{3})$/u);
  if (match) return Object.freeze({ precision: "year", year: match[1], month: null, day: null });
  match = date.match(/^([1-9][0-9]{3})-(0[1-9]|1[0-2])$/u);
  if (match) return Object.freeze({ precision: "month", year: match[1], month: match[2], day: null });
  match = date.match(/^([1-9][0-9]{3})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/u);
  if (match) {
    const value = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    if (value.getUTCFullYear() === Number(match[1]) && value.getUTCMonth() === Number(match[2]) - 1 && value.getUTCDate() === Number(match[3])) return Object.freeze({ precision: "day", year: match[1], month: match[2], day: match[3] });
  }
  throw new RangeError("date must be an actual calendar date in YYYY, YYYY-MM, or YYYY-MM-DD form");
}

function measureTime(time, precision) {
  if (time === undefined || time === null) return null;
  if (precision !== "day") throw new RangeError("time requires day-precision date evidence");
  if (typeof time !== "string" || !/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/u.test(time)) throw new RangeError("time must use HH:MM");
  return time;
}

/** Project one canonical path from explicit date evidence; omitted precision stays omitted. */
export function projectMarkdownDatePath({ date, time = null, slug, extension }) {
  if (typeof slug !== "string" || !slugPattern.test(slug)) throw new RangeError("slug must be lowercase kebab-case");
  if (typeof extension !== "string" || !extensionPattern.test(extension)) throw new RangeError("extension must be lowercase dot-separated alphanumerics without a leading dot");
  const measured = measureDate(date);
  const measuredTime = measureTime(time, measured.precision);
  let path;
  if (measured.precision === "undated") path = `undated/${slug}.${extension}`;
  else if (measured.precision === "year") path = `${measured.year}/${measured.year}-${slug}.${extension}`;
  else if (measured.precision === "month") path = `${measured.year}/${measured.month}/${measured.year}-${measured.month}-${slug}.${extension}`;
  else {
    const clock = measuredTime === null ? "" : `-${measuredTime.replace(":", "")}h`;
    path = `${measured.year}/${measured.month}/${measured.day}/${measured.year}-${measured.month}-${measured.day}${clock}-${slug}.${extension}`;
  }
  return Object.freeze({ kind: "red-cup-engineering.markdown-date-path-projection", date, precision: measured.precision, time: measuredTime, slug, extension, path });
}
