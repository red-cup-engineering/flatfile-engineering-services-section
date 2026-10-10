#!/usr/bin/env node
import { readFileSync as readCarrierInput } from "node:fs";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { dataArtifactAddress } from "@red-cup-engineering/eavt/data-artifact-address";
import {
  EMPTY_WITNESS_ROOT,
  identifyJsonSemanticContent,
} from "@red-cup-engineering/computer-content-engineering-services-section/semantic-content-identity";
import { termToJson } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { tm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { readEavtEntriesSince } from "@red-cup-engineering/eavt/read-eavt-entries";
import { normalizeSeavtRow } from "./normalize-seavt-row.mjs";
import { journalDirectoryOf } from "./journal/store-root.mjs";
import { projectSegmentStatements, readingCache } from "./journal/filesystem/segment-store.mjs";

/** The feed every semantic record was appended to before records were journal witnesses. */
const LEGACY_FEED = "witness-journal-seavt";
const TOLD = Object.freeze({
  unknown: Object.freeze({ for: false, against: false }),
  held: Object.freeze({ for: true, against: false }),
  denied: Object.freeze({ for: false, against: true }),
  contested: Object.freeze({ for: true, against: true }),
});
const CHARGE_OF_CLAIM = new Map(Object.keys(TOLD).map((charge) => [canonicalJson(tm.mark(`semantic-record.${charge}`)), charge]));

export const inputSchema = {
  type: "object",
  properties: {
    root: { type: "string", minLength: 1 },
    objectKind: { type: "string", minLength: 1 },
    category: { type: "string", minLength: 1 },
  },
  required: ["root", "objectKind", "category"],
  additionalProperties: false,
};
export const outputSchema = { type: "array", items: { type: "object" } };

/** The dated directories (YYYY/MM/DD) under one tier directory, as dates, in order. */
function datesUnder(directory) {
  const dates = [];
  const list = (path, pattern) => {
    try {
      return readdirSync(path, { withFileTypes: true }).filter((entry) => entry.isDirectory() && pattern.test(entry.name)).map((entry) => entry.name).sort();
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  };
  for (const year of list(directory, /^\d{4}$/u)) {
    for (const month of list(join(directory, year), /^\d{2}$/u)) {
      for (const day of list(join(directory, year, month), /^\d{2}$/u)) dates.push(`${year}-${month}-${day}`);
    }
  }
  return dates;
}

/** A semantic record is a projection of its verified witness. The query keeps
 * these typed values; repeated board/agency reads need not decode old witnesses. */
function semanticRecordOf(statement) {
  const row = statement.observation.payload;
  if (!Array.isArray(row) || row.length !== 4) return undefined;
  const charge = CHARGE_OF_CLAIM.get(canonicalJson(statement.observation.claim));
  if (charge === undefined) return undefined;
  const [e, a, v, t] = row;
  return Object.freeze({ id: termToJson(e), category: termToJson(a), recordedAt: t,
    record: termToJson(v), told: TOLD[charge], event: statement.id,
    origin: statement.observation.seat, causes: statement.observation.causes });
}

/** Records of one kind and category admitted into the journal as witnesses. */
function journalRecords(root, kind, categories) {
  const records = [];
  for (const date of datesUnder(journalDirectoryOf(root))) {
    const logPath = dataArtifactAddress({ root, tier: "log", encoding: "jsonl", at: date, action: kind, subject: kind }).path;
    for (const record of projectSegmentStatements(logPath, semanticRecordOf)) {
      if (categories.has(record.category)) records.push(Object.freeze({ ...record, objectKind: kind,
        record: structuredClone(record.record), origin: structuredClone(record.origin),
        causes: Object.freeze([...record.causes]) }));
    }
  }
  return records;
}

/** One process's readings of the SEAVT feeds, per feed, kind and category: the feed is
 * append-only, so a query parses only what was appended since the last one rather
 * than every historical row (some carry whole signed roadmaps) on every read. The
 * readings are disposable and bounded by the heap their records are estimated to
 * hold, so a long-lived process over a large or growing set of feeds keeps at most
 * `legacyReadingLimits.heap` of them; an evicted feed is parsed again on its next
 * query. Keys name one category each, so queries over overlapping category sets
 * share readings instead of each holding its own copy. */
export const legacyReadingLimits = { heap: 32 * 1024 * 1024, entries: 4096 };
const LEGACY_DECODED_FACTOR = 3;
const LEGACY_RECORD_HEAP = 200;
let legacyReadings = readingCache(legacyReadingLimits.heap, legacyReadingLimits.entries);

/** Forget every held SEAVT feed reading and apply the current limits (tests and migration). */
export function clearLegacyReadings() {
  legacyReadings = readingCache(legacyReadingLimits.heap, legacyReadingLimits.entries);
}

/** The heap the held SEAVT feed readings are estimated to take, and how many are held. */
export function legacyReadingUse() {
  return Object.freeze({ heap: legacyReadings.cost, entries: legacyReadings.size });
}

const deepFreeze = (value) => {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return value;
};

/** The SEAVT feed files under a root's dated log directories, in order. */
function legacyFeedFiles(directory) {
  const found = [];
  try {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, item.name);
      if (item.isDirectory()) found.push(...legacyFeedFiles(path));
      else if (item.isFile() && item.name === `${LEGACY_FEED}.jsonl`) found.push(path);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return found.sort();
}

/** One feed's records of one kind and category, read on from the held reading when there is one. */
function legacyFeedRecords(path, kind, category) {
  const key = `${path}\0${kind}\0${category}`;
  const held = legacyReadings.get(key);
  const { rows, reading, reset } = readEavtEntriesSince({ path, since: held?.reading }, {
    select: (entry) => termToJson(Array.isArray(entry) ? entry[1] : entry?.a) === category,
  });
  if (held !== undefined && !reset && rows.length === 0) return held.records;
  const kept = held === undefined || reset ? [] : [...held.records];
  let heap = held === undefined || reset ? 0 : held.heap;
  for (const entry of rows) {
    // A category query admits only its selected semantic rows. Typing every
    // unrelated value before selection made each enterprise reading replay
    // the full legacy corpus (including large roadmap terms).
    const row = normalizeSeavtRow(entry);
    const id = termToJson(row.e);
    const value = termToJson(row.v);
    if (identifyJsonSemanticContent({ objectKind: kind, value, witnessRoot: EMPTY_WITNESS_ROOT }).id !== id) continue;
    // Held values are frozen, never handed out: each query returns its own copy.
    kept.push(Object.freeze({ id, objectKind: kind, category, recordedAt: row.t, record: deepFreeze(value) }));
    heap += Buffer.byteLength(JSON.stringify(value)) * LEGACY_DECODED_FACTOR + LEGACY_RECORD_HEAP;
  }
  const records = Object.freeze(kept);
  if (reading === undefined) legacyReadings.delete(key);
  else legacyReadings.keep(key, { reading, records, heap }, heap);
  return records;
}

/** Records written to the SEAVT feed before records were journal witnesses: a record is of a kind when its id is its content's address under that kind. */
function legacyRecords(root, kind, categories) {
  const records = [];
  for (const path of legacyFeedFiles(join(root, "data", "logs"))) {
    for (const category of categories) {
      for (const record of legacyFeedRecords(path, kind, category)) records.push(Object.freeze({ ...record, record: structuredClone(record.record) }));
    }
  }
  return records;
}

/** Every record of one kind and category, from the journal and from the earlier SEAVT feed, once each, in the order recorded. */
export function querySemanticRecords({ root, objectKind, category } = {}) {
  if (
    typeof root !== "string" ||
    !root ||
    typeof objectKind !== "string" ||
    !objectKind ||
    typeof category !== "string" ||
    !category
  )
    throw new TypeError(
      "Semantic record journal root, objectKind, and category are required",
    );
  return querySemanticRecordCategories({ root, objectKind, categories: [category] });
}

/** One scoped observation of a kind across its required categories. */
export function querySemanticRecordCategories({ root, objectKind, categories } = {}) {
  if (typeof root !== "string" || !root || typeof objectKind !== "string" || !objectKind
    || !Array.isArray(categories) || categories.length === 0 || categories.some(category => typeof category !== "string" || !category)) {
    throw new TypeError("Semantic record journal root, objectKind, and categories are required");
  }
  const selected = new Set(categories);
  const custodyRoot = resolve(root);
  const seen = new Set();
  const records = [];
  for (const record of [...legacyRecords(custodyRoot, objectKind, selected), ...journalRecords(custodyRoot, objectKind, selected)]) {
    const key = canonicalJson([record.category, record.event ?? canonicalJson([record.id, record.recordedAt, record.told, record.origin])]);
    if (seen.has(key)) continue;
    seen.add(key);
    records.push(record);
  }
  return Object.freeze(records.map((record, index) => ({ record, index }))
    .sort((left, right) => String(left.record.recordedAt).localeCompare(String(right.record.recordedAt)) || left.index - right.index)
    .map(({ record }) => record));
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(
      querySemanticRecords(JSON.parse(readCarrierInput(0, "utf8"))),
    ) + "\n",
  );
