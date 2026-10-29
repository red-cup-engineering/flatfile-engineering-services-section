/**
 * The compact SEAVT row carrier, profile `seavt-row-json-carrier/1`.
 *
 * A SEAVT row is `{e, a, v, t}` with e, a and v closed SEN terms. The term of a JSON value under the SEN bridge
 * (`jsonToTerm`) wraps every scalar as `["pair", ["mark", "\"sen.json.string\""], ["mark", "\"…\""]]`, about an
 * order of magnitude over the JSON it denotes. The bridge is injective, so a coordinate that IS the image of a
 * JSON value is carried as that value and re-admitted with `jsonToTerm` on read: nothing is lost.
 *
 * A carried row is a plain JSON object ("line"):
 *
 *   at   ISO 8601 UTC instant that files the row under a day (always present)
 *   t    the row's `t` when it differs from `at` (absent means t === at)
 *   ej | e   the entity: `ej` is a JSON value carried by the bridge; `e` is a full term spine
 *   aj | a   the attribute, likewise
 *   vj | v   the value, likewise
 *
 * Exactly one of `xj` / `x` is present per coordinate; any other member is refused. The writer chooses `xj` only
 * when `jsonToTerm(termToJson(term))` equals the term, verified at write time, so a term outside the bridge's
 * image (a lambda, a bare mark, an unsorted object spine) keeps its full spine and is never altered. Readers
 * accept both forms in any mixture, which is also the form of every row written before this profile (`e`,`a`,`v`
 * spines with a `t` and no `at`; give such a row to `rowOfLine` with `{ at }` or let `t` serve as `at`).
 */
import { jsonToTerm, termToJson } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { seavtRow } from "./admit-seavt-row.mjs";
import { isAbsoluteSeavtClock, isSeavtCalendarDate, utcFilingInstant } from "./clock.mjs";

export const SEAVT_CARRIER_PROFILE = "seavt-row-json-carrier/1";

const COORDINATES = ["e", "a", "v"];

/** Structural equality of two terms (nested arrays of strings), without recursion depth limits. */
export function termsEqual(left, right) {
  const stack = [[left, right]];
  while (stack.length > 0) {
    const [a, b] = stack.pop();
    if (a === b) continue;
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) stack.push([a[i], b[i]]);
  }
  return true;
}

/** The JSON value whose bridge image is exactly `term`, as `{ json }`; or undefined when `term` is outside the image. */
export function jsonImageOf(term) {
  let json;
  try {
    json = termToJson(term);
    return termsEqual(jsonToTerm(json), term) ? { json } : undefined;
  } catch { return undefined; }
}

/** The instant a row is filed under: its `t` when that is a UTC instant or a bare date, else the one given. */
export function atOf(row, at) {
  if (at !== undefined) {
    if (typeof at !== "string" || !at.endsWith("Z") || !isAbsoluteSeavtClock(at))
      throw new TypeError("\`at\` is an ISO 8601 UTC instant");
    return at;
  }
  if (isAbsoluteSeavtClock(row.t)) return utcFilingInstant(row.t);
  if (isSeavtCalendarDate(row.t)) return row.t + "T00:00:00.000Z";
  throw new TypeError("a SEAVT row's \`t\` is not a date or instant; supply \`at\` to file it");
}

/** The carried line of a row. Throws if the row is not a SEAVT row; `at` files it (default: from `t`). */
export function lineOfRow(input, { at } = {}) {
  const row = seavtRow(input);
  const filed = atOf(row, at);
  const line = { at: filed };
  if (row.t !== filed) line.t = row.t;
  for (const key of COORDINATES) {
    const image = jsonImageOf(row[key]);
    if (image !== undefined) line[`${key}j`] = image.json; else line[key] = row[key];
  }
  return line;
}

/** The SEAVT row of a carried line (either form per coordinate), admitted through `seavtRow`. */
export function rowOfLine(line, { at } = {}) {
  if (line === null || typeof line !== "object" || Array.isArray(line)) throw new TypeError("a SEAVT line is an object");
  const allowed = new Set(["at", "t", ...COORDINATES, ...COORDINATES.map((key) => `${key}j`)]);
  for (const key of Object.keys(line)) if (!allowed.has(key)) throw new TypeError(`a SEAVT line has no member ${JSON.stringify(key)} in ${SEAVT_CARRIER_PROFILE}`);
  if (Object.hasOwn(line, "at")) atOf({ t: line.at }, line.at);
  const row = {};
  for (const key of COORDINATES) {
    const hasJson = Object.hasOwn(line, `${key}j`), hasTerm = Object.hasOwn(line, key);
    if (hasJson === hasTerm) throw new TypeError(`a SEAVT line carries exactly one of ${key} and ${key}j`);
    // The plain form the store's other feeds write, `{at, e: "x", a: "y", v: {…}}`: a coordinate that is not an array
    // cannot be a term spine, so it is a JSON value. (A JSON array in a plain `e` is read as a spine; write `ej`.)
    row[key] = hasJson ? jsonToTerm(line[`${key}j`]) : Array.isArray(line[key]) ? line[key] : jsonToTerm(line[key]);
  }
  row.t = Object.hasOwn(line, "t") ? line.t : (line.at ?? at);
  if (row.t === undefined) throw new TypeError("a SEAVT line has neither `t` nor `at`");
  return seavtRow(row);
}

/** Whether two rows are term-equal in e, a, v and t. */
export const rowsEqual = (a, b) => termsEqual(a.e, b.e) && termsEqual(a.a, b.a) && termsEqual(a.v, b.v) && JSON.stringify(a.t) === JSON.stringify(b.t);
