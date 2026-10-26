/**
 * SEAVT rows in the store's day logs, in the compact carrier (seavt-carrier.mjs).
 *
 * `appendSeavtRow` is the writer every SEAVT feed uses: the row goes in as one carried line, the first append
 * of a new day seals the earlier days, and a guard (log-budget.mjs) may cap the day. `readSeavtRows` reads sealed
 * and open data alike, and reads rows written before the carrier existed.
 */
import { append, logDates, readLog } from "./store-core.mjs";
import { SEAVT_ROW_BYTES_MAX } from "./layout.mjs";
import { atOf, lineOfRow, rowOfLine } from "./seavt-carrier.mjs";

/** The one store writer used by single-row and multi-day batch admission. */
const appendLine = (root, feed, line, { at, guard, seal, durableRoot } = {}) =>
  append(root, feed, line, { maxBytes: SEAVT_ROW_BYTES_MAX, at, guard, seal, durableRoot });

/** Append one row to the feed's day log. Returns true when written, false when the guard refused it. */
export function appendSeavtRow(root, feed, row, { at, guard, seal, carrierProfile, durableRoot } = {}) {
  const filedAt = atOf(row, at);
  return appendLine(root, feed, lineOfRow(row, { at: filedAt, carrierProfile }), { at: filedAt, guard, seal, durableRoot });
}

/** Append rows in original order, returning the number written. A cap refusal
 * stops only that feed-day: later rows of the denied day remain unattempted,
 * even when interleaved with a separately admissible day. */
export function appendSeavtRows(root, feed, rows, { at, guard, seal, carrierProfile, durableRoot } = {}) {
  const refusedDays = new Set();
  let written = 0;
  for (const row of rows) {
    const filedAt = atOf(row, at), day = filedAt.slice(0, 10);
    if (refusedDays.has(day)) continue; // refused days cannot admit later rows
    if (!appendLine(root, feed, lineOfRow(row, { at: filedAt, carrierProfile }), { at: filedAt, guard, seal, durableRoot })) refusedDays.add(day);
    else written += 1;
  }
  return written;
}

/** One day's rows from byte `from`: `{row, next}`. A line that is not a SEAVT row is skipped, as `readLog` skips a bad line. */
export function* readSeavtRows(root, feed, date, { from = 0 } = {}) {
  for (const { line, next } of readLog(root, feed, date, { from })) {
    let row;
    try { row = rowOfLine(line); } catch { continue; }
    yield { row, next };
  }
}

/** Every row of the feed, day by day in order: `{row, date, next}`. */
export function* readSeavtFeed(root, feed) {
  for (const date of logDates(root, feed)) for (const { row, next } of readSeavtRows(root, feed, date)) yield { row, date, next };
}
