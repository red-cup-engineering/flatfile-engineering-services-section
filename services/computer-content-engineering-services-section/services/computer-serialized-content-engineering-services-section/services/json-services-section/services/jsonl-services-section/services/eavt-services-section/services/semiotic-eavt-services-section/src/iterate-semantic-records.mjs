/**
 * Semantic records of one kind and category read a day at a time, oldest first, through a date:
 * a reader that folds a long journal into a projection (a roadmap glued from many cuts, say)
 * holds one day's witnesses at a time rather than the whole history. Each witness is verified
 * as every reader verifies it (`projectSegmentStatements`, shared readings) and projected with
 * `semanticRecordOf`. Legacy SEAVT feed rows (before records were witnesses) are not read here;
 * a reader that still holds such rows reads them with `read-seavt-entries` beside this.
 *
 * `semanticRecordRevisionThroughDate` names the journal's state through a date (each day's
 * segment and its size), so a reader can keep one projection per revision and know when to
 * read again.
 */
import { statSync } from "node:fs";
import { resolve } from "node:path";
import { dataArtifactAddress } from "@red-cup-engineering/eavt-services-section/data-artifact-address";

import { projectSegmentStatements, segmentPath } from "./journal/filesystem/segment-store.mjs";
import { datesOfKind, semanticRecordOf } from "./query-semantic-records.mjs";

function checked({ root, objectKind, category, throughDate }) {
  if (typeof root !== "string" || !root || typeof objectKind !== "string" || !objectKind || typeof category !== "string" || !category) {
    throw new TypeError("Semantic record journal root, objectKind, and category are required");
  }
  if (throughDate !== undefined && (typeof throughDate !== "string" || !/^\d{4}-\d{2}-\d{2}/u.test(throughDate))) throw new TypeError("throughDate must be an ISO date");
  return resolve(root);
}

const daysThrough = (root, objectKind, throughDate) => datesOfKind(root, objectKind).filter((date) => throughDate === undefined || date <= throughDate.slice(0, 10));
const segmentOf = (root, objectKind, date) => segmentPath(dataArtifactAddress({ root, tier: "log", encoding: "jsonl", at: date, action: objectKind, subject: objectKind }).path);

/** The records of `objectKind` under `category` recorded through `throughDate` (every day when absent), one at a time, in the order recorded. */
export function* iterateSemanticRecordsThroughDate({ root, objectKind, category, throughDate } = {}) {
  const custodyRoot = checked({ root, objectKind, category, throughDate });
  for (const date of daysThrough(custodyRoot, objectKind, throughDate)) {
    const logPath = dataArtifactAddress({ root: custodyRoot, tier: "log", encoding: "jsonl", at: date, action: objectKind, subject: objectKind }).path;
    for (const record of projectSegmentStatements(logPath, semanticRecordOf)) {
      if (record.category === category) yield Object.freeze({ ...record, objectKind, record: structuredClone(record.record) });
    }
  }
}

/** The journal's state for `objectKind` through `throughDate`: each day that has a segment, with its size. Equal revisions read alike. */
export function semanticRecordRevisionThroughDate({ root, objectKind, throughDate } = {}) {
  const custodyRoot = checked({ root, objectKind, category: "revision", throughDate });
  const days = [];
  for (const date of daysThrough(custodyRoot, objectKind, throughDate)) {
    try { days.push(`${date}:${statSync(segmentOf(custodyRoot, objectKind, date)).size}`); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  return days.join(",");
}
