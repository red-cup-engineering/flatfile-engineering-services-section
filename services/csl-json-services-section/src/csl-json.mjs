/**
 * @module csl-json
 * The org's one CSL-JSON (`csl-data.json`, CSL 1.0.2) algebra: the item type
 * vocabulary, name objects, date objects, DOI normalization, title folding,
 * and item admission. A record format profiled over JSON, seated in
 * computer-data beside JSON Schema and CloudEvents; every downstream
 * knowledge system (bibliography, scholarly retrieval, citation rendering)
 * consumes this rather than growing its own copy.
 *
 * Pure data-in/data-out; no I/O, no network.
 */

import { isObjectRecord as isRecord } from "@red-cup-engineering/json-services-section";

/** CSL 1.0.2 item types. */
export const CSL_TYPES = Object.freeze([
  "article", "article-journal", "article-magazine", "article-newspaper",
  "bill", "book", "broadcast", "chapter", "classic", "collection",
  "dataset", "document", "entry", "entry-dictionary", "entry-encyclopedia",
  "event", "figure", "graphic", "hearing", "interview", "legal_case",
  "legislation", "manuscript", "map", "motion_picture", "musical_score",
  "pamphlet", "paper-conference", "patent", "performance", "periodical",
  "personal_communication", "post", "post-weblog", "regulation", "report",
  "review", "review-book", "software", "song", "speech", "standard",
  "thesis", "treaty", "webpage",
]);

const CSL_TYPE_SET = new Set(CSL_TYPES);

const MONTH_ABBREVIATIONS = Object.freeze({
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
});

function isNonEmptyString(value) { return typeof value === "string" && value.trim() !== ""; }

/**
 * Coerce a value to a trimmed non-empty string, taking a finite number as
 * its decimal form.
 *
 * @param {unknown} value
 * @returns {(string|undefined)} the trimmed string, or undefined.
 */
export function cslString(value) {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

/**
 * @param {string} type
 * @returns {boolean} whether `type` is a CSL 1.0.2 item type.
 */
export function isCslType(type) { return CSL_TYPE_SET.has(type); }

/**
 * Resolve a source vocabulary's raw type word into a CSL 1.0.2 item type.
 * The source's own alias table is consulted FIRST, so a word the source
 * uses in its own sense (OpenAlex's `"article"`, meaning a journal article)
 * reads as the source means it rather than as the CSL type that happens to
 * share its spelling. An unaliased word that is already a CSL type passes
 * through; anything else falls back to `"document"`.
 *
 * @param {unknown} rawType
 * @param {Readonly<Record<string, string>>} [aliases] - the source's type word -> CSL type.
 * @returns {string} a member of the CSL 1.0.2 type vocabulary.
 */
export function toCslType(rawType, aliases = {}) {
  const value = cslString(rawType)?.toLowerCase();
  if (value === undefined) return "document";
  const aliased = aliases[value];
  if (aliased !== undefined) return aliased;
  return isCslType(value) ? value : "document";
}

/**
 * @param {object} name - a candidate CSL name object.
 * @returns {boolean} whether it has a nonempty `family` or `literal`.
 */
export function isValidCslName(name) {
  if (name === null || typeof name !== "object") return false;
  if (isNonEmptyString(name.family)) return true;
  if (isNonEmptyString(name.literal)) return true;
  return false;
}

/**
 * Build one CSL name object from already-separated parts: `{family, given}`
 * when either structured part is known, `{literal}` when only a display
 * string is available.
 *
 * @param {{literal?: string, family?: string, given?: string}} [parts]
 * @returns {({family?: string, given?: string, literal?: string}|undefined)} the frozen name, or undefined when no part is usable.
 */
export function cslName({ literal, family, given } = {}) {
  const f = cslString(family);
  const g = cslString(given);
  if (f !== undefined || g !== undefined) {
    const name = {};
    if (f !== undefined) name.family = f;
    if (g !== undefined) name.given = g;
    return Object.freeze(name);
  }
  const l = cslString(literal);
  return l === undefined ? undefined : Object.freeze({ literal: l });
}

/**
 * Normalize a heterogeneous list of author entries — display strings, or
 * records carrying `{family, given}` / `{literal}` — into CSL name objects.
 *
 * @param {ReadonlyArray<unknown>} names
 * @returns {(ReadonlyArray<{family?: string, given?: string, literal?: string}>|undefined)} the frozen names, or undefined when none is usable.
 */
export function cslNames(names) {
  if (!Array.isArray(names)) return undefined;
  const out = names
    .map((n) => (typeof n === "string" ? cslName({ literal: n }) : isRecord(n) ? cslName(n) : undefined))
    .filter((n) => n !== undefined);
  return out.length > 0 ? Object.freeze(out) : undefined;
}

/**
 * Turn a "Given Family" (or "Family, Given" / single-token / institutional)
 * string into a CSL name object. A comma splits "Family, Given"; an
 * institutional-looking phrase (of/for/and/the/association/institute/...)
 * or a single token becomes `{literal}`; otherwise the last word is taken
 * as the family name.
 *
 * @param {string} raw
 * @returns {{family?: string, given?: string, literal?: string}} a CSL name object.
 */
export function nameFromString(raw) {
  const s = String(raw).trim();
  if (s === "") return { literal: "" };
  if (s.includes(",")) {
    const [family, ...rest] = s.split(",");
    const given = rest.join(",").trim();
    const name = { family: family.trim() };
    if (given) name.given = given;
    return name;
  }
  const parts = s.split(/\s+/);
  const looksInstitutional = /\b(of|for|and|the|association|institute|organization|committee|consortium|group|university|press|inc\.?|ltd\.?|corp\.?)\b/i.test(s);
  if (looksInstitutional || parts.length === 1) return { literal: s };
  const family = parts.pop();
  return { family, given: parts.join(" ") };
}

/**
 * Flatten one CSL name object to a "Given Family" string (or its literal),
 * the inverse of {@link nameFromString}.
 *
 * @param {object} name - a CSL name object (`{family[, given]}` | `{literal}`).
 * @returns {string} the flattened name.
 * @throws {TypeError} when neither `family` nor `literal` is a nonempty string.
 */
export function nameToString(name) {
  if (!isValidCslName(name)) throw new TypeError("not a valid CSL name object ({family[,given]} | {literal})");
  if (isNonEmptyString(name.literal)) return name.literal.trim();
  return isNonEmptyString(name.given) ? `${name.given.trim()} ${name.family.trim()}` : name.family.trim();
}

/**
 * Build a CSL date object from explicit numeric parts. A month or day that
 * is not an integer is dropped; a year that is not an integer refuses the
 * whole date.
 *
 * @param {number} year
 * @param {number} [month]
 * @param {number} [day]
 * @returns {({"date-parts": ReadonlyArray<ReadonlyArray<number>>}|undefined)} the frozen CSL date, or undefined.
 */
export function cslDate(year, month, day) {
  if (!Number.isInteger(year)) return undefined;
  const parts = [year];
  if (Number.isInteger(month)) parts.push(month);
  if (Number.isInteger(day)) parts.push(day);
  return Object.freeze({ "date-parts": Object.freeze([Object.freeze(parts)]) });
}

/**
 * Parse an ISO-like date string ("YYYY-MM-DD", "YYYY-MM", or "YYYY") into a
 * CSL date object.
 *
 * @param {unknown} value
 * @returns {({"date-parts": ReadonlyArray<ReadonlyArray<number>>}|undefined)}
 */
export function cslDateFromIsoString(value) {
  const s = cslString(value);
  if (s === undefined) return undefined;
  const match = s.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/u);
  if (match === null) return undefined;
  return cslDate(Number(match[1]), match[2] ? Number(match[2]) : undefined, match[3] ? Number(match[3]) : undefined);
}

/**
 * Parse a PubMed-style date string ("2026 Sep 1", "2026 Sep", "2026") into a
 * CSL date object.
 *
 * @param {unknown} value
 * @returns {({"date-parts": ReadonlyArray<ReadonlyArray<number>>}|undefined)}
 */
export function cslDateFromPubmedString(value) {
  const s = cslString(value);
  if (s === undefined) return undefined;
  const match = s.match(/^(\d{4})(?:\s+([A-Za-z]{3})(?:\s+(\d{1,2}))?)?/u);
  if (match === null) return undefined;
  const month = match[2] ? MONTH_ABBREVIATIONS[match[2].toLowerCase()] : undefined;
  return cslDate(Number(match[1]), month, match[3] ? Number(match[3]) : undefined);
}

/**
 * Build a CSL date object from an already-`date-parts`-shaped array (an
 * array of `[year, month?, day?]` tuples; only the first tuple is read).
 *
 * @param {unknown} dateParts
 * @returns {({"date-parts": ReadonlyArray<ReadonlyArray<number>>}|undefined)}
 */
export function cslDateFromDateParts(dateParts) {
  if (!Array.isArray(dateParts) || dateParts.length === 0 || !Array.isArray(dateParts[0])) return undefined;
  const [year, month, day] = dateParts[0];
  return cslDate(year, month, day);
}

/**
 * Extract the canonical issued year from a CSL date object.
 *
 * @param {object} date
 * @returns {(number|null)} the year, or null when it cannot be read.
 */
export function issuedYear(date) {
  if (date === null || typeof date !== "object") return null;
  const parts = date["date-parts"];
  if (Array.isArray(parts) && Array.isArray(parts[0]) && Number.isInteger(parts[0][0])) return parts[0][0];
  return null;
}

function isValidCslDate(date) {
  if (date === null || typeof date !== "object") return false;
  const parts = date["date-parts"];
  if (parts !== undefined) {
    if (!Array.isArray(parts) || parts.length < 1 || parts.length > 2) return false;
    for (const p of parts) {
      if (!Array.isArray(p) || p.length < 1 || p.length > 3) return false;
      if (!p.every((n) => Number.isInteger(n))) return false;
    }
    return true;
  }
  // A date given only as a literal/raw/season is tolerated.
  return isNonEmptyString(date.literal) || isNonEmptyString(date.raw) || isNonEmptyString(date.season);
}

/**
 * Strip a DOI down to its bare `10.xxxx/yyyy` form, whatever prefix
 * (`https://doi.org/`, `http://dx.doi.org/`, `doi:`) it arrived with.
 *
 * @param {unknown} value
 * @returns {(string|undefined)}
 */
export function bareDoi(value) {
  const s = cslString(value);
  if (s === undefined) return undefined;
  return s.replace(/^https?:\/\/(dx\.)?doi\.org\//iu, "").replace(/^doi:/iu, "");
}

/**
 * Fold a bibliographic title to its comparison form: compatibility-decomposed
 * (so "Müller" and "Muller" fold alike), lowercased, with every run of
 * non-alphanumerics collapsed to one space and the result trimmed. The one
 * title-identity rule for the whole house — reference reconciliation,
 * CrossRef verification, and screening dedup all compare titles through it,
 * so a fold match means the same thing everywhere.
 *
 * @param {unknown} title
 * @returns {string} the folded title ("" when there is nothing to fold).
 */
export function normalizeTitle(title) {
  const s = cslString(title);
  if (s === undefined) return "";
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/gu, "")
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

function finding(path, message) { return Object.freeze({ path, message }); }

/**
 * Recognize whether an object is an admissible CSL-JSON item, against the
 * subset of the csl-data contract this house needs downstream (a citekey
 * `id`, a `title`, an `issued` year, and at least one named author or
 * editor) — not the full per-type conditional-required-field discipline of
 * the CSL schema (e.g. `article-journal` requiring `container-title`),
 * which is CSL rendering policy rather than something the house depth-1
 * reference-entry contract needs. Unrecognized CSL fields (`volume`,
 * `page`, ...) are tolerated: CSL-JSON is an open bibliographic vocabulary.
 *
 * @param {object} item
 * @returns {{admitted: boolean, findings: Array<{path: string, message: string}>}} frozen report.
 */
export function recognizeCslItem(item) {
  if (!isRecord(item)) {
    return Object.freeze({ admitted: false, findings: Object.freeze([finding("", "item must be an object")]) });
  }
  const findings = [];
  if (!isNonEmptyString(item.id)) findings.push(finding(".id", 'missing required non-empty string "id"'));
  if (item.type === undefined) findings.push(finding(".type", 'missing required "type"'));
  else if (!isCslType(item.type)) findings.push(finding(".type", `"${item.type}" is not a CSL 1.0.2 type`));
  if (!isNonEmptyString(item.title)) findings.push(finding(".title", 'missing required non-empty string "title"'));
  if (item.issued === undefined) findings.push(finding(".issued", 'missing required "issued" date'));
  else if (!isValidCslDate(item.issued)) findings.push(finding(".issued", "not a valid CSL date object"));

  if (item.author === undefined && item.editor === undefined) {
    findings.push(finding("", 'item must have at least one of "author" or "editor"'));
  }
  for (const role of ["author", "editor"]) {
    const list = item[role];
    if (list === undefined) continue;
    if (!Array.isArray(list) || list.length === 0) {
      findings.push(finding(`.${role}`, `"${role}" must be a non-empty array of CSL name objects`));
      continue;
    }
    list.forEach((name, i) => {
      if (!isValidCslName(name)) findings.push(finding(`.${role}[${i}]`, "not a valid CSL name object ({family[,given]} | {literal})"));
    });
  }
  for (const field of ["container-title", "publisher", "DOI", "URL", "note"]) {
    if (item[field] !== undefined && !isNonEmptyString(item[field])) findings.push(finding(`.${field}`, `"${field}" must be a non-empty string`));
  }
  return Object.freeze({ admitted: findings.length === 0, findings: Object.freeze(findings) });
}

/**
 * Admit one CSL-JSON item, throwing with the collected findings when refused.
 *
 * @param {object} item
 * @returns {object} the frozen, admitted CSL-JSON item.
 * @throws {Error} carrying `.findings` when the item is refused.
 */
export function admitCslItem(item) {
  const recognized = recognizeCslItem(item);
  if (!recognized.admitted) {
    const error = new Error(`CSL-JSON item refused: ${recognized.findings.map(({ path, message }) => `${path}: ${message}`).join("; ")}`);
    error.findings = recognized.findings;
    throw error;
  }
  return Object.freeze({ ...item });
}

/**
 * Drop every key whose value is `undefined`, so a projected item carries
 * only the CSL fields its source actually supplied.
 *
 * @param {Record<string, unknown>} item
 * @returns {Record<string, unknown>} a shallow copy without undefined-valued keys.
 */
export function stripUndefinedCslFields(item) {
  const out = {};
  for (const [key, value] of Object.entries(item)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}
