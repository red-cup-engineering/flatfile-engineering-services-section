#!/usr/bin/env node
/**
 * @module project-openalex-work-csl
 * The transformation: one OpenAlex work object (from a `/works` search
 * result or a single `/works/{id}` fetch) to a CSL-JSON item. Reads the
 * work as JSON on stdin, writes the CSL-JSON item on stdout.
 */

import { readFileSync } from "node:fs";
import {
  isObjectRecord as isRecord,
} from "@red-cup-engineering/json-services-section";
import {
  bareDoi,
  cslDate,
  cslDateFromIsoString,
  cslNames,
  cslString as str,
  stripUndefinedCslFields,
  toCslType,
} from "../src/csl-json.mjs";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** OpenAlex's own type words, in OpenAlex's sense, as CSL 1.0.2 types. */
export const OPENALEX_TYPE_ALIASES = Object.freeze({
  article: "article-journal",
  "journal-article": "article-journal",
  "book-chapter": "chapter",
  "posted-content": "manuscript",
  preprint: "manuscript",
  dissertation: "thesis",
  "proceedings-article": "paper-conference",
  "reference-entry": "entry-encyclopedia",
});

/**
 * Normalize one OpenAlex work object to a CSL-JSON item.
 *
 * @param {Readonly<Record<string, unknown>>} work
 * @returns {object} a frozen CSL-JSON item.
 * @throws {TypeError} when work is not a record, or carries neither an id nor a title.
 */
export function openAlexWorkToCsl(work) {
  if (!isRecord(work)) throw new TypeError("openAlexWorkToCsl requires a work object");
  const title = str(work.title) ?? str(work.display_name);
  const id = str(work.id);
  if (title === undefined && id === undefined) {
    throw new TypeError("openAlexWorkToCsl: work carries neither an id nor a title");
  }
  const location = isRecord(work.primary_location) ? work.primary_location : {};
  const source = isRecord(location.source) ? location.source : {};
  const biblio = isRecord(work.biblio) ? work.biblio : {};
  const authorships = Array.isArray(work.authorships) ? work.authorships : [];
  const doi = bareDoi(work.doi);
  const page = str(biblio.first_page) !== undefined
    ? [str(biblio.first_page), str(biblio.last_page)].filter((p) => p !== undefined).join("-")
    : undefined;

  const item = {
    id: id !== undefined ? id.replace(/^https:\/\/openalex\.org\//iu, "") : undefined,
    type: toCslType(work.type, OPENALEX_TYPE_ALIASES),
    title,
    author: cslNames(authorships.map((a) => (isRecord(a) && isRecord(a.author) ? a.author.display_name : undefined))),
    "container-title": str(source.display_name),
    publisher: str(source.host_organization_name),
    volume: str(biblio.volume),
    issue: str(biblio.issue),
    page,
    issued: cslDateFromIsoString(work.publication_date) ?? cslDate(work.publication_year),
    DOI: doi,
    URL: str(location.landing_page_url) ?? (doi !== undefined ? `https://doi.org/${doi}` : undefined),
  };
  return Object.freeze(stripUndefinedCslFields(item));
}

function main() {
  const work = JSON.parse(readFileSync(0, "utf8"));
  process.stdout.write(`${JSON.stringify(openAlexWorkToCsl(work), null, 2)}\n`);
}

if ((process.argv[1] !== undefined && (() => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })())) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message ?? error}\n`);
    process.exitCode = 1;
  }
}
