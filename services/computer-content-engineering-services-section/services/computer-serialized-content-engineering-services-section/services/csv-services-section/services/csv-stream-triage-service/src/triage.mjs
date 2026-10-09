import { csvRecords } from "./csv-stream.mjs";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/u;
const nonEmpty = (value) => typeof value === "string" && value.length > 0;

/**
 * Admits a triage spec (a data record, see data/records/schema/triage-spec.schema.json)
 * or throws. Filters are exact string matches on named columns; nothing is
 * interpreted as code.
 */
export function admitTriageSpec(spec) {
  const fail = (reason) => { throw new TypeError(`triage spec ${JSON.stringify(spec?.id)}: ${reason}`); };
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) throw new TypeError("triage spec must be an object");
  if (spec.kind !== "triage-spec" || spec.version !== 1) fail("kind must be triage-spec, version 1");
  if (typeof spec.id !== "string" || !SLUG.test(spec.id)) fail("id must be a slug");
  if (!/^https:\/\/[^\s/]+/u.test(spec.source?.url ?? "")) fail("source.url must be an https URL");
  if (!Array.isArray(spec.filters)) fail("filters must be a list");
  for (const filter of spec.filters) {
    if (!nonEmpty(filter?.column)) fail("every filter names a column");
    const ops = ["equals", "in", "notEmpty"].filter((op) => Object.hasOwn(filter, op));
    if (ops.length !== 1) fail(`filter on ${filter.column} needs exactly one of equals, in, notEmpty`);
    if (ops[0] === "equals" && typeof filter.equals !== "string") fail(`filter on ${filter.column}: equals must be a string`);
    if (ops[0] === "in" && (!Array.isArray(filter.in) || filter.in.length === 0 || filter.in.some((v) => typeof v !== "string"))) fail(`filter on ${filter.column}: in must be a non-empty list of strings`);
    if (ops[0] === "notEmpty" && filter.notEmpty !== true) fail(`filter on ${filter.column}: notEmpty must be true`);
  }
  if (spec.deadline !== undefined && (!nonEmpty(spec.deadline.column) || spec.deadline.mustBeAfterRun !== true)) fail("deadline needs a column and mustBeAfterRun: true");
  if (!Array.isArray(spec.keep) || spec.keep.length === 0 || spec.keep.some((c) => !nonEmpty(c))) fail("keep must list the columns to retain");
  if (spec.limit !== undefined && (!Number.isInteger(spec.limit) || spec.limit < 1)) fail("limit must be a positive integer");
  return spec;
}

/** @returns {number|null} epoch milliseconds, or null when the text is not ISO 8601 with an offset */
export function parseDeadline(text) {
  if (typeof text !== "string" || !ISO_WITH_OFFSET.test(text)) return null;
  const time = Date.parse(text);
  return Number.isNaN(time) ? null : time;
}

const passes = (filter, record) => {
  const value = record[filter.column];
  if (value === undefined) return false;
  if (filter.equals !== undefined) return value === filter.equals;
  if (filter.in !== undefined) return filter.in.includes(value);
  return value !== "";
};

/**
 * Streams records through the spec once and returns the dated triage record.
 * `notices` holds the `limit` soonest-deadline matches (all of them when no
 * limit is set), each with only the `keep` columns plus `deadline` (UTC ISO).
 * Counts say how many rows were read, matched, dropped for an empty or
 * unparseable deadline, or past it, and how many rows were malformed.
 * Contact columns are never kept unless the spec lists them.
 * @param {AsyncIterable<Uint8Array|string>|Iterable<Uint8Array|string>} chunks
 * @param {object} spec
 * @param {{now?: Date, source?: object}} [options]
 */
export async function triage(chunks, spec, { now = new Date(), source = {} } = {}) {
  admitTriageSpec(spec);
  const runStart = now.getTime();
  const counts = { scanned: 0, matchedFilters: 0, matched: 0, noDeadline: 0, unparseableDeadline: 0, pastDeadline: 0, malformedRows: 0 };
  const kept = [];
  let missingColumns = null;
  for await (const record of csvRecords(chunks, { onMalformed: () => { counts.malformedRows += 1; } })) {
    if (missingColumns === null) {
      const needed = [...spec.filters.map((f) => f.column), ...spec.keep, ...(spec.deadline ? [spec.deadline.column] : [])];
      missingColumns = needed.filter((column) => !Object.hasOwn(record, column));
      if (missingColumns.length) throw new TypeError(`csv lacks columns the spec names: ${missingColumns.join(", ")}`);
    }
    counts.scanned += 1;
    if (!spec.filters.every((filter) => passes(filter, record))) continue;
    counts.matchedFilters += 1;
    let deadline = null;
    if (spec.deadline) {
      const raw = record[spec.deadline.column];
      if (raw === "") { counts.noDeadline += 1; continue; }
      const time = parseDeadline(raw);
      if (time === null) { counts.unparseableDeadline += 1; continue; }
      if (time <= runStart) { counts.pastDeadline += 1; continue; }
      deadline = time;
    }
    counts.matched += 1;
    kept.push({ deadlineMs: deadline, notice: { ...Object.fromEntries(spec.keep.map((column) => [column, record[column]])), ...(deadline === null ? {} : { deadline: new Date(deadline).toISOString() }) } });
  }
  kept.sort((a, b) => (a.deadlineMs ?? Infinity) - (b.deadlineMs ?? Infinity));
  const notices = kept.slice(0, spec.limit ?? kept.length).map((entry) => entry.notice);
  return Object.freeze({ kind: "triage-record", version: 1, generatedAt: now.toISOString(), specId: spec.id, source: { url: spec.source.url, ...source }, counts, notices });
}
