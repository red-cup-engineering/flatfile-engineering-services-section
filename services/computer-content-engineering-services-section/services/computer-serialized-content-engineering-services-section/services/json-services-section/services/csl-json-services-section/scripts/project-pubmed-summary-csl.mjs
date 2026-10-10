#!/usr/bin/env node
/**
 * @module project-pubmed-summary-csl
 * The transformation: one PubMed E-utilities `esummary` result record (one
 * entry under `result.<uid>`) to a CSL-JSON item. Reads the summary record
 * as JSON on stdin, writes the CSL-JSON item on stdout.
 */

import { readFileSync } from "node:fs";
import { isObjectRecord as isRecord } from "@red-cup-engineering/json-services-section";
import {
  cslDateFromPubmedString,
  cslNames,
  cslString as str,
  stripUndefinedCslFields,
  toCslType,
} from "../src/csl-json.mjs";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** PubMed's own publication-type words, in PubMed's sense, as CSL 1.0.2 types. */
export const PUBMED_TYPE_ALIASES = Object.freeze({
  "journal article": "article-journal",
  review: "review",
  letter: "article-journal",
  "case reports": "article-journal",
  "clinical trial": "article-journal",
  preprint: "manuscript",
  comment: "article-journal",
});

/**
 * Normalize one PubMed `esummary` record to a CSL-JSON item.
 *
 * @param {Readonly<Record<string, unknown>>} summary
 * @returns {object} a frozen CSL-JSON item.
 * @throws {TypeError} when summary is not a record, or carries no uid.
 */
export function pubmedSummaryToCsl(summary) {
  if (!isRecord(summary)) throw new TypeError("pubmedSummaryToCsl requires a summary object");
  const uid = str(summary.uid);
  if (uid === undefined) throw new TypeError("pubmedSummaryToCsl: summary carries no uid");
  const authors = Array.isArray(summary.authors) ? summary.authors : [];
  const articleIds = Array.isArray(summary.articleids) ? summary.articleids : [];
  const doi = str(articleIds.find((a) => isRecord(a) && a.idtype === "doi")?.value);
  const pubtype = Array.isArray(summary.pubtype) ? summary.pubtype[0] : undefined;

  const item = {
    id: uid,
    type: toCslType(pubtype, PUBMED_TYPE_ALIASES),
    title: str(summary.title),
    author: cslNames(authors.map((a) => (isRecord(a) ? a.name : undefined))),
    "container-title": str(summary.fulljournalname) ?? str(summary.source),
    volume: str(summary.volume),
    issue: str(summary.issue),
    page: str(summary.pages),
    issued: cslDateFromPubmedString(summary.pubdate),
    DOI: doi,
    URL: `https://pubmed.ncbi.nlm.nih.gov/${uid}`,
    note: `PMID: ${uid}`,
  };
  return Object.freeze(stripUndefinedCslFields(item));
}

function main() {
  const summary = JSON.parse(readFileSync(0, "utf8"));
  process.stdout.write(`${JSON.stringify(pubmedSummaryToCsl(summary), null, 2)}\n`);
}

if ((process.argv[1] !== undefined && (() => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })())) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message ?? error}\n`);
    process.exitCode = 1;
  }
}
