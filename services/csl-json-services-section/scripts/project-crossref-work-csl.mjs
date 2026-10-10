#!/usr/bin/env node
/**
 * @module project-crossref-work-csl
 * The transformation: one CrossRef work object (the `message` field of a
 * `/works/{doi}` response) to a CSL-JSON item. CrossRef's own record is
 * already CSL-shaped; this flattens the array-wrapped `title` and
 * `container-title` fields CrossRef uses. Reads the work as JSON on stdin,
 * writes the CSL-JSON item on stdout.
 */

import { readFileSync } from "node:fs";
import { isObjectRecord as isRecord } from "@red-cup-engineering/json-services-section";
import {
  cslDateFromDateParts,
  cslNames,
  cslString as str,
  stripUndefinedCslFields,
  toCslType,
} from "../src/csl-json.mjs";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** CrossRef's own type words, in CrossRef's sense, as CSL 1.0.2 types. */
export const CROSSREF_TYPE_ALIASES = Object.freeze({
  "journal-article": "article-journal",
  "proceedings-article": "paper-conference",
  "book-chapter": "chapter",
  book: "book",
  monograph: "book",
  dataset: "dataset",
  report: "report",
  "posted-content": "manuscript",
  dissertation: "thesis",
  "reference-entry": "entry-encyclopedia",
  "journal-issue": "document",
  standard: "standard",
});

/**
 * Normalize one CrossRef work object to a CSL-JSON item.
 *
 * @param {Readonly<Record<string, unknown>>} message
 * @returns {object} a frozen CSL-JSON item.
 * @throws {TypeError} when message is not a record, or carries no DOI.
 */
export function crossrefWorkToCsl(message) {
  if (!isRecord(message)) throw new TypeError("crossrefWorkToCsl requires a work object");
  const doi = str(message.DOI);
  if (doi === undefined) throw new TypeError("crossrefWorkToCsl: work carries no DOI");
  const authors = Array.isArray(message.author) ? message.author : [];

  const item = {
    id: doi,
    type: toCslType(message.type, CROSSREF_TYPE_ALIASES),
    title: str(Array.isArray(message.title) ? message.title[0] : message.title),
    author: cslNames(authors.map((a) => (isRecord(a) ? a : undefined))),
    "container-title": str(Array.isArray(message["container-title"]) ? message["container-title"][0] : message["container-title"]),
    publisher: str(message.publisher),
    volume: str(message.volume),
    issue: str(message.issue),
    page: str(message.page),
    issued: cslDateFromDateParts(message.issued?.["date-parts"]),
    DOI: doi,
    URL: str(message.URL) ?? `https://doi.org/${doi}`,
  };
  return Object.freeze(stripUndefinedCslFields(item));
}

function main() {
  const message = JSON.parse(readFileSync(0, "utf8"));
  process.stdout.write(`${JSON.stringify(crossrefWorkToCsl(message), null, 2)}\n`);
}

if ((process.argv[1] !== undefined && (() => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })())) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message ?? error}\n`);
    process.exitCode = 1;
  }
}
