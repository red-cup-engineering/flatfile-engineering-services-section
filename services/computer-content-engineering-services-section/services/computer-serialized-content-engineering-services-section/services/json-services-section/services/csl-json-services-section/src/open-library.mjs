/**
 * @module open-library
 * Open Library ISBN retrieval and native-record projection into the house's
 * CSL-JSON format. Network access is injectable and every request identifies
 * the 561 Group.
 */

import {
  admitCslItem,
  cslDate,
  cslString,
  nameFromString,
  stripUndefinedCslFields,
} from "./csl-json.mjs";

const OPEN_LIBRARY_ORIGIN = "https://openlibrary.org";
const USER_AGENT = "561-group-bibliography-services/1.0 (https://561.group)";

const asRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
const firstString = (value) => Array.isArray(value) ? value.map(cslString).find(Boolean) : cslString(value);
const sourceUrl = (key) => `${OPEN_LIBRARY_ORIGIN}${key}.json`;

/** Remove presentation punctuation from an ISBN without asserting validity. */
export function normalizeIsbn(value) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).replace(/^isbn(?:-1[03])?:?/iu, "").replace(/[\s-]/gu, "").toUpperCase();
}

/** Validate an ISBN-10 or ISBN-13, including its check digit. */
export function isValidIsbn(value) {
  const isbn = normalizeIsbn(value);
  if (/^\d{9}[\dX]$/u.test(isbn)) {
    return [...isbn].reduce((sum, digit, index) => sum + (digit === "X" ? 10 : Number(digit)) * (10 - index), 0) % 11 === 0;
  }
  if (/^\d{13}$/u.test(isbn)) {
    return [...isbn].reduce((sum, digit, index) => sum + Number(digit) * (index % 2 === 0 ? 1 : 3), 0) % 10 === 0;
  }
  return false;
}

function yearFrom(value) {
  const match = cslString(value)?.match(/(?:^|\D)(\d{4})(?:\D|$)/u);
  return match ? Number(match[1]) : undefined;
}

function authorName(record) {
  const name = cslString(record.name) ?? cslString(record.personal_name);
  return name === undefined ? undefined : nameFromString(name);
}

/**
 * Project an Open Library edition plus its work and author records to one
 * CSL-JSON book item. The edition is authoritative for ISBN, pagination and
 * publisher; the work fills title, first publication date and authors only
 * where the edition is silent.
 */
export function openLibraryBookToCsl({ isbn, edition, work = {}, authors = [], sources = [] }) {
  const cleanIsbn = normalizeIsbn(isbn);
  const editionRecord = asRecord(edition);
  const workRecord = asRecord(work);
  const names = authors.map(asRecord).map(authorName).filter(Boolean);
  const year = yearFrom(editionRecord.publish_date) ?? yearFrom(workRecord.first_publish_date);
  const item = stripUndefinedCslFields({
    id: cleanIsbn,
    type: "book",
    title: cslString(editionRecord.title) ?? cslString(workRecord.title),
    author: names.length > 0 ? names : undefined,
    issued: cslDate(year),
    publisher: firstString(editionRecord.publishers),
    ISBN: cleanIsbn,
    "number-of-pages": Number.isInteger(editionRecord.number_of_pages) ? editionRecord.number_of_pages : undefined,
    URL: `${OPEN_LIBRARY_ORIGIN}/isbn/${encodeURIComponent(cleanIsbn)}`,
    note: sources.length > 0 ? `Open Library sources: ${sources.join(", ")}` : undefined,
  });
  return admitCslItem(item);
}

/** Project one Open Library search document into a CSL-JSON book candidate. */
export function openLibrarySearchDocumentToCsl(document) {
  const record = asRecord(document);
  const key = cslString(record.key);
  const isbn = firstString(record.isbn);
  const authors = Array.isArray(record.author_name) ? record.author_name.map(nameFromString) : undefined;
  return Object.freeze(stripUndefinedCslFields({
    id: key?.replace(/^\/works\//u, "") ?? isbn ?? cslString(record.title),
    type: "book",
    title: cslString(record.title),
    author: authors,
    issued: cslDate(Number.isInteger(record.first_publish_year) ? record.first_publish_year : undefined),
    publisher: firstString(record.publisher),
    ISBN: isbn,
    "number-of-pages": Number.isInteger(record.number_of_pages_median) ? record.number_of_pages_median : undefined,
    URL: key ? `${OPEN_LIBRARY_ORIGIN}${key}` : isbn ? `${OPEN_LIBRARY_ORIGIN}/isbn/${isbn}` : undefined,
    note: "Source: Open Library search",
  }));
}

async function requestJson(url, fetchImpl) {
  const response = await fetchImpl(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Open Library request failed: HTTP ${response.status} (${url})`);
  const value = await response.json();
  if (value === null || typeof value !== "object") throw new Error(`Open Library returned malformed JSON (${url})`);
  return value;
}

/**
 * Retrieve an ISBN edition, its first work record, and every referenced author.
 * Returns null only when Open Library has no edition for the valid ISBN.
 */
export async function fetchOpenLibraryBook(isbn, { fetchImpl = fetch } = {}) {
  const cleanIsbn = normalizeIsbn(isbn);
  if (!isValidIsbn(cleanIsbn)) {
    const error = new TypeError(`invalid ISBN checksum: ${cleanIsbn || String(isbn)}`);
    error.code = "invalid-isbn";
    throw error;
  }
  const editionUrl = `${OPEN_LIBRARY_ORIGIN}/isbn/${encodeURIComponent(cleanIsbn)}.json`;
  const edition = await requestJson(editionUrl, fetchImpl);
  if (edition === null) return null;
  const sources = [editionUrl];
  const workKey = asRecord(Array.isArray(edition.works) ? edition.works[0] : undefined).key;
  const workUrl = cslString(workKey) ? sourceUrl(workKey) : null;
  const work = workUrl ? await requestJson(workUrl, fetchImpl) ?? {} : {};
  if (workUrl) sources.push(workUrl);
  const authorRefs = Array.isArray(edition.authors) && edition.authors.length > 0 ? edition.authors : work.authors;
  const authorKeys = (Array.isArray(authorRefs) ? authorRefs : [])
    .map((entry) => cslString(asRecord(asRecord(entry).author).key) ?? cslString(asRecord(entry).key))
    .filter(Boolean);
  const authorUrls = authorKeys.map(sourceUrl);
  const authors = await Promise.all(authorUrls.map((url) => requestJson(url, fetchImpl)));
  sources.push(...authorUrls);
  return Object.freeze({
    record: openLibraryBookToCsl({ isbn: cleanIsbn, edition, work, authors: authors.filter(Boolean), sources }),
    sources: Object.freeze(sources),
  });
}

/** Search Open Library by title and optional first-author display name. */
export async function searchOpenLibraryBooks(title, author, { fetchImpl = fetch, limit = 5 } = {}) {
  if (typeof title !== "string" || title.trim() === "") throw new TypeError("searchOpenLibraryBooks requires a title");
  const url = new URL(`${OPEN_LIBRARY_ORIGIN}/search.json`);
  url.searchParams.set("title", title.trim());
  if (typeof author === "string" && author.trim() !== "") url.searchParams.set("author", author.trim());
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("fields", "key,title,author_name,first_publish_year,isbn,publisher,number_of_pages_median");
  const body = await requestJson(url, fetchImpl);
  if (!body || !Array.isArray(body.docs)) throw new Error("Open Library search returned no docs array");
  return Object.freeze({
    items: Object.freeze(body.docs.map(openLibrarySearchDocumentToCsl)),
    source: url.toString(),
  });
}
