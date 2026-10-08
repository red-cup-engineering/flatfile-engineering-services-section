const YEAR = "(?:[1-9][0-9]{3})";
const MONTH = "(?:0[1-9]|1[0-2])";
const DAY = "(?:0[1-9]|[12][0-9]|3[01])";
const SLUG = "[a-z0-9]+(?:-[a-z0-9]+)*";
const EXTENSION = "[a-z0-9]+(?:\\.[a-z0-9]+)*";
const patterns = Object.freeze([
  Object.freeze({ precision: "day", expression: new RegExp(`^(${YEAR})/(${MONTH})/(${DAY})/\\1-\\2-\\3(?:-([01][0-9]|2[0-3])([0-5][0-9])h)?-(${SLUG})\\.(${EXTENSION})$`, "u") }),
  Object.freeze({ precision: "month", expression: new RegExp(`^(${YEAR})/(${MONTH})/\\1-\\2-(${SLUG})\\.(${EXTENSION})$`, "u") }),
  Object.freeze({ precision: "year", expression: new RegExp(`^(${YEAR})/\\1-(${SLUG})\\.(${EXTENSION})$`, "u") }),
  Object.freeze({ precision: "undated", expression: new RegExp(`^undated/(${SLUG})\\.(${EXTENSION})$`, "u") }),
]);

function validDay(year, month, day) {
  const value = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return value.getUTCFullYear() === Number(year) && value.getUTCMonth() === Number(month) - 1 && value.getUTCDate() === Number(day);
}

/** Measure one collection-relative path without inventing missing date fields. */
export function measureMarkdownDatePath(path) {
  if (typeof path !== "string" || path.length === 0) throw new TypeError("path must be a nonempty string");
  const findings = [];
  if (path.startsWith("/") || path.includes("\\") || path.split("/").includes("..")) findings.push(Object.freeze({ rule: "relative-posix-path", message: "path must be a relative POSIX path" }));
  if (/(?:^|\/)0{4}(?:\/|-)|(?:^|\/)00(?:\/|-)/u.test(path)) findings.push(Object.freeze({ rule: "no-zero-date-placeholders", message: "unknown date components must be omitted, not encoded as zero" }));
  let observation = null;
  for (const pattern of patterns) {
    const match = path.match(pattern.expression);
    if (!match) continue;
    if (pattern.precision === "day") {
      const [, year, month, day, hour, minute, slug, extension] = match;
      if (!validDay(year, month, day)) findings.push(Object.freeze({ rule: "calendar-date", message: `${year}-${month}-${day} is not a calendar date` }));
      observation = Object.freeze({ precision: "day", date: `${year}-${month}-${day}`, time: hour === undefined ? null : `${hour}:${minute}`, slug, extension });
    } else if (pattern.precision === "month") {
      const [, year, month, slug, extension] = match;
      observation = Object.freeze({ precision: "month", date: `${year}-${month}`, time: null, slug, extension });
    } else if (pattern.precision === "year") {
      const [, year, slug, extension] = match;
      observation = Object.freeze({ precision: "year", date: year, time: null, slug, extension });
    } else {
      const [, slug, extension] = match;
      observation = Object.freeze({ precision: "undated", date: null, time: null, slug, extension });
    }
    break;
  }
  if (observation === null) findings.push(Object.freeze({ rule: "reduced-precision-date-path", message: "path must represent day, month, year, or undated precision without placeholders" }));
  return Object.freeze({ kind: "red-cup-engineering.markdown-date-path-measurement", path, conformant: observation !== null && findings.length === 0, observation, findings: Object.freeze(findings) });
}
