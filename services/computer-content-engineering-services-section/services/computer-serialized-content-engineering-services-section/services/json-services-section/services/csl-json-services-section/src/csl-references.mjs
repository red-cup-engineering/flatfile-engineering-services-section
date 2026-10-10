/**
 * codecs/text/csl — the bibliographic layer of markdown-vault frontmatter, normalized to
 * CSL-JSON (citeproc).
 *
 * The corpus carries citations under a `references:` frontmatter key in two
 * mutually incompatible dialects: the standard CSL sequence of maps, and a
 * bespoke citekey→record map. This codec reads both from an already-decoded
 * frontmatter value (compose it with `decodeYaml`) and normalizes to one
 * target: valid CSL-JSON items. Author strings become `{ literal }` names —
 * always-valid CSL; family/given splitting is downstream enrichment, never
 * required for validity. `referencesFrontmatterValue` is the write leg: items
 * back to the plain value `encodeYaml` serializes, so references round-trip
 * through a document instead of only being read out of one.
 *
 * Also here: promotion of source URLs to minimal webpage references, the
 * `[@id]` / `[cite:@id]` body-citation read, and the internal cross-reference
 * taxonomy (citation fields project to bibliography; relation fields are a
 * typed concept graph and must not be flattened into one).
 */

import { isObjectRecord } from "@red-cup-engineering/json-services-section";
import {
  cslDate,
  cslDateFromDateParts,
  cslDateFromIsoString,
  cslNames,
  cslString,
  toCslType as resolveCslType,
} from "./csl-json.mjs";

/** A CSL-JSON name: family/given parts or a single literal string. */

/** A CSL-JSON date: a date-parts array of [year, month?, day?] tuples. */

/** A CSL-JSON reference item: a required type plus the standard optional CSL
 *  fields, open to any further string-keyed CSL fields. */

/** The dialect a references block was found in: "csl" (sequence of maps),
 *  "citekey-map" (bespoke citekey→record map), "empty" (present but empty),
 *  "none" (no references key), or "mixed" (an unrecognized shape). */

/** Decoded references: the detected dialect plus the normalized CSL items. */

const EMPTY = Object.freeze({ dialect: "none", items: Object.freeze([]) });
const EMPTY_PRESENT = Object.freeze({ dialect: "empty", items: Object.freeze([]) });

const HTTP_URL_PATTERN = /^https?:\/\/[^\s<>"']+$/iu;
const CITATION_PATTERN = /\[(?:cite:)?@([A-Za-z0-9][A-Za-z0-9_:.#/$%&+?~=-]*(?:\s*;\s*@[A-Za-z0-9][A-Za-z0-9_:.#/$%&+?~=-]*)*)\]/gu;

const isRecord = isObjectRecord;

const str = cslString;

// — decoding —

/** Decode a frontmatter record's `references` key to normalized CSL items. */
export function referencesOfFrontmatter(frontmatter) {
  if (!isRecord(frontmatter)) throw new TypeError("csl: frontmatter must be a record");
  if (!("references" in frontmatter)) return EMPTY;
  return decodeReferencesValue(frontmatter["references"]);
}

/** Decode one already-parsed `references` value (array, map, or absence). */
export function decodeReferencesValue(value) {
  if (value === undefined || value === null) return EMPTY;
  if (Array.isArray(value)) {
    const items = normalizeCslSequence(value);
    return items.length === 0 ? EMPTY_PRESENT : Object.freeze({ dialect: "csl", items });
  }
  if (isRecord(value)) {
    const items = normalizeCitekeyMap(value);
    if (Object.keys(value).length === 0) return EMPTY_PRESENT;
    return items.length === 0
      ? Object.freeze({ dialect: "mixed", items: Object.freeze([]) })
      : Object.freeze({ dialect: "citekey-map", items });
  }
  return Object.freeze({ dialect: "mixed", items: Object.freeze([]) });
}

// — CSL vocabulary —

const TYPE_ALIASES = Object.freeze({
  article: "article-journal",
  journal: "article-journal",
  paper: "paper-conference",
  conference: "paper-conference",
  website: "webpage",
  web: "webpage",
  blog: "post-weblog",
  misc: "document",
  repository: "report",
  techreport: "report",
});

const NAME_FIELDS = Object.freeze(["author", "editor", "translator", "container-author", "collection-editor", "director", "recipient"]);
const DATE_FIELDS = Object.freeze(["issued", "accessed", "original-date", "submitted", "event-date"]);
const CITEKEY_RENAMED = Object.freeze(["authors", "author", "publication", "journal", "pages", "page", "year", "issued", "doi", "DOI", "url", "URL", "type", "class"]);
const NON_CSL_REFERENCE_KEYS = new Set(["key", "citation-key", "citation_key", "source_kind", "source-kind", "publisher_category", "publisher-category"]);

function toCslType(raw) {
  return resolveCslType(raw, TYPE_ALIASES);
}

function toCslDate(value) {
  if (typeof value === "number" && Number.isInteger(value)) return cslDate(value);
  if (typeof value === "string") {
    return /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/u.test(value.trim()) ? cslDateFromIsoString(value) : undefined;
  }
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    if (isRecord(first)) {
      const parts = ["year", "month", "day"]
        .map((key) => first[key])
        .filter((part) => typeof part === "number");
      if (parts.length > 0) return cslDate(parts[0], parts[1], parts[2]);
    }
    if (typeof first === "number") return cslDate(first);
  }
  if (isRecord(value) && Array.isArray(value["date-parts"])) {
    const tuples = (value["date-parts"])
      .map((tuple) => Array.isArray(tuple) ? tuple.filter((part) => typeof part === "number") : [])
      .filter((tuple) => tuple.length > 0);
    if (tuples.length === 1) return cslDateFromDateParts(tuples);
    if (tuples.length > 1) return Object.freeze({ "date-parts": Object.freeze(tuples.map((tuple) => Object.freeze(tuple))) });
  }
  return undefined;
}

function toCslNames(value) {
  const raw = Array.isArray(value) ? value : value === null || value === undefined ? [] : [value];
  return cslNames(raw);
}

// CSL dialect: items are already CSL-shaped, so preserve every field and only
// fix up the shapes the YAML-as-CSL convention writes differently from
// CSL-JSON (year scalars → date-parts, string names → literal). An allowlist
// here would silently drop valid CSL (editor, edition, ISBN, …).
function normalizeCslSequence(value) {
  const items = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const item = { ...entry };
    item["type"] = toCslType(entry["type"]);
    const id = str(entry["id"]);
    if (id !== undefined) item["id"] = id;
    for (const field of NAME_FIELDS) {
      const names = toCslNames(entry[field]);
      if (names !== undefined) item[field] = names;
      else if (entry[field] !== undefined) delete item[field];
    }
    for (const field of DATE_FIELDS) {
      const date = toCslDate(entry[field]);
      if (date !== undefined) item[field] = date;
      else if (entry[field] !== undefined) delete item[field];
    }
    items.push(Object.freeze(item));
  }
  return Object.freeze(items);
}

// Citekey-map dialect: each citekey → flat record; the key becomes the CSL id.
// This is a translation (bespoke field names → CSL), so an explicit rename map
// is right; unrenamed fields are preserved since they may be valid CSL.
function normalizeCitekeyMap(value) {
  const items = [];
  for (const [citekey, entry] of Object.entries(value)) {
    if (!isRecord(entry)) continue;
    const item = { ...entry };
    for (const field of CITEKEY_RENAMED) delete item[field];
    const explicitType = str(entry["type"]) ?? str(entry["class"]);
    const inferred = entry["publication"] !== undefined || entry["journal"] !== undefined || entry["container-title"] !== undefined || entry["volume"] !== undefined || entry["issue"] !== undefined
      ? "article-journal"
      : entry["publisher"] !== undefined ? "book" : "document";
    item["type"] = explicitType !== undefined ? toCslType(explicitType) : inferred;
    if (citekey !== "") item["id"] = citekey;
    const author = toCslNames(entry["author"] ?? entry["authors"]);
    if (author !== undefined) item["author"] = author;
    const container = str(entry["container-title"]) ?? str(entry["publication"]) ?? str(entry["journal"]);
    if (container !== undefined) item["container-title"] = container;
    const page = str(entry["page"]) ?? str(entry["pages"]);
    if (page !== undefined) item["page"] = page;
    const issued = toCslDate(entry["issued"] ?? entry["year"]);
    if (issued !== undefined) item["issued"] = issued;
    const doi = str(entry["DOI"]) ?? str(entry["doi"]);
    if (doi !== undefined) item["DOI"] = doi;
    const url = str(entry["URL"]) ?? str(entry["url"]);
    if (url !== undefined) item["URL"] = url;
    items.push(Object.freeze(item));
  }
  return Object.freeze(items);
}

// — promotion and normalization of authored records —

/** The reference id a URL yields when a record carries none. */
export function referenceIdFromUrl(url, index) {
  try {
    const domain = new URL(url).hostname.replace(/^www\./u, "").toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");
    return `${domain || "reference"}${index + 1}`;
  } catch {
    return `reference${index + 1}`;
  }
}

/** The reference title a URL yields when a record carries none. */
export function referenceTitleFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./u, "");
  } catch {
    return url;
  }
}

/** Promote intake source URLs into minimal CSL webpage references — the
 *  publication boundary between research material and the cited cut. */
export function referencesFromSourceUrls(sourceUrls) {
  const urls = [...new Set(sourceUrls)];
  for (const [index, url] of urls.entries()) {
    if (!HTTP_URL_PATTERN.test(url)) throw new TypeError(`sourceUrls[${index}] must be an http(s) URL`);
  }
  return Object.freeze(urls.map((url, index) => Object.freeze({
    id: referenceIdFromUrl(url, index),
    type: "webpage",
    title: referenceTitleFromUrl(url),
    URL: url,
  })));
}

/** Normalize already-authored reference records to canonical CSL: `url`
 *  becomes `URL`, legacy cite keys become `id`, missing type/title default
 *  from the URL, and corpus-local source classifications are dropped because
 *  they are readings, not CSL. */
export function normalizeCslReferenceRecords(rawReferences) {
  if (!Array.isArray(rawReferences)) return Object.freeze([]);
  return Object.freeze(rawReferences.flatMap((rawReference, index) => {
    if (!isRecord(rawReference)) return [];
    const url = str(rawReference["URL"]) ?? str(rawReference["url"]);
    const id = str(rawReference["id"]) ?? str(rawReference["key"]) ?? str(rawReference["citation-key"]) ?? str(rawReference["citation_key"])
      ?? (url === undefined ? `reference${index + 1}` : referenceIdFromUrl(url, index));
    const type = str(rawReference["type"]) ?? (url === undefined ? "document" : "webpage");
    const title = str(rawReference["title"]) ?? (url === undefined ? `Reference ${index + 1}` : referenceTitleFromUrl(url));
    const record = {};
    for (const [key, value] of Object.entries(rawReference)) {
      if (NON_CSL_REFERENCE_KEYS.has(key) || key === "url") continue;
      record[key] = value;
    }
    record["id"] = id;
    record["type"] = toCslType(type);
    record["title"] = title;
    if (url !== undefined) {
      if (!HTTP_URL_PATTERN.test(url)) throw new TypeError(`references[${index}] URL must be an http(s) URL`);
      record["URL"] = url;
    }
    return [Object.freeze(record)];
  }));
}

// — the write leg —

const LEADING_FIELDS = Object.freeze(["id", "type", "title"]);

/** Encode CSL items as the plain `references` frontmatter value (id/type/title
 *  leading, every other field following), ready for `encodeYaml`. The inverse
 *  of `decodeReferencesValue` up to the normalization decoding always applies:
 *  decodeReferencesValue(referencesFrontmatterValue(items)).items = items. */
export function referencesFrontmatterValue(items) {
  return items.map((item) => {
    const record = {};
    for (const key of orderedItemKeys(item)) {
      const value = item[key];
      if (value === undefined || value === null) continue;
      record[key] = value;
    }
    return record;
  });
}

function orderedItemKeys(item) {
  const rest = Object.keys(item).filter((key) => !LEADING_FIELDS.includes(key));
  return [...LEADING_FIELDS.filter((key) => item[key] !== undefined), ...rest];
}

/** Return a frontmatter record with its `references` key set to the canonical
 *  CSL sequence (or removed when items are empty and none were present). */
export function withFrontmatterReferences(frontmatter, items) {
  if (items.length === 0 && !("references" in frontmatter)) return frontmatter;
  return Object.freeze({ ...frontmatter, references: referencesFrontmatterValue(items) });
}

// — body citations —

/** Every reference id cited in a markdown body via `[@id]` or `[cite:@id]`
 *  (semicolon groups included), in order of appearance. */
export function citedReferenceIds(markdown) {
  const ids = [];
  for (const match of markdown.matchAll(CITATION_PATTERN)) {
    for (const id of (match[1] ?? "").split(/\s*;\s*@/u).map((key) => key.trim()).filter(Boolean)) ids.push(id);
  }
  return Object.freeze(ids);
}

// — internal cross-references —

/** Frontmatter fields treated as bibliographic citations to other corpus
 *  pieces — the fields that project cleanly to CSL references. */
export const CITATION_FIELDS = Object.freeze([
  "see-also", "derived_from", "derives-from", "related", "discusses", "recaps", "cites", "sources", "builds-on", "grounds",
]);

/** Frontmatter fields treated as typed concept-graph relations between corpus
 *  pieces — fields whose predicate is information and so are NOT flattened
 *  into a bibliography. */
export const RELATION_FIELDS = Object.freeze([
  "depends-on", "requires", "part-of", "component-of", "contrasts-with", "enables", "extends", "realizes", "instantiated-by",
]);

/** Which class an internal cross-reference field belongs to. */

/** One extracted internal cross-reference: source field, kind, and the raw
 *  slug or relative path written as the target value. */

/** Extract every internal cross-reference target from a frontmatter record,
 *  tagged by field and kind. Does not resolve targets — that needs the vault index. */
export function internalReferenceTargets(frontmatter) {
  const out = [];
  const collect = (field, kind) => {
    const value = frontmatter[field];
    if (value === undefined || value === null) return;
    for (const item of Array.isArray(value) ? value : [value]) {
      if (typeof item === "string" && item.trim() !== "") {
        out.push(Object.freeze({ field, kind, value: item.trim() }));
      }
    }
  };
  for (const field of CITATION_FIELDS) collect(field, "citation");
  for (const field of RELATION_FIELDS) collect(field, "relation");
  return Object.freeze(out);
}

/** The slug a target resolves by: the last path segment without `.md`. */
export function referenceSlug(value) {
  const trimmed = value.trim().replace(/^\/+/u, "");
  const last = trimmed.includes("/") ? (trimmed.split("/").pop() ?? trimmed) : trimmed;
  return last.replace(/\.md$/iu, "");
}
