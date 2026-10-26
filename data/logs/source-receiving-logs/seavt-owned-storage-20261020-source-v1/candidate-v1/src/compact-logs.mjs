/**
 * Convert the SEN-spine JSONL logs of `data/logs/<feed>-seavt-logs` to the compact carrier, sealed.
 *
 * For each plain day file (`<date>.jsonl` or the earlier `<date>-admit-<kind>.jsonl`):
 *  1. every line is read; a line that is a SEAVT row (`e`,`a`,`v` terms, `t`, optionally `at`) becomes a carried
 *     line, and is verified at once: the carried line, parsed back and re-admitted, is term-equal to the row;
 *     any other line (not JSON, not a row, extra members) is carried through byte for byte;
 *  2. the carried lines are sealed as the day's next BGZF segment;
 *  3. the segment is read back and must equal the carried lines, line for line;
 *  4. only then is the source dealt with: with `remove`, deleted; else a file in the new layout (`<date>.jsonl`,
 *     which readers would count twice) is renamed `<date>.jsonl.legacy`, and an earlier-named file stays beside a
 *     `<name>.compacted` receipt so a rerun skips it. Nothing is removed unless `remove` is set.
 * A file with a row too large to read back (SEAVT_ROW_BYTES_MAX) is left alone and reported.
 */
import { closeSync, createReadStream, existsSync, fsyncSync, openSync, readSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync, writeSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { SEAVT_ROW_BYTES_MAX, logsDirectory } from "./layout.mjs";
import { segmentLines, segmentsOf, writeSegment } from "./sealed-log.mjs";
import { atOf, lineOfRow, rowOfLine, rowsEqual } from "./seavt-carrier.mjs";
import { seavtRow } from "./admit-seavt-row.mjs";

const SOURCE = /^(\d{4}-\d{2}-\d{2})(?:-admit-[A-Za-z0-9.-]+)?\.jsonl$/u;
const ROW_KEYS = new Set(["e", "a", "v", "t", "at"]);

/** Lines of a text file, streamed (a final unterminated line included). */
export function* fileLines(file) {
  const fd = openSync(file, "r"), chunk = Buffer.allocUnsafe(1 << 20);
  let parts = [], position = 0;
  try {
    for (;;) {
      const read = readSync(fd, chunk, 0, chunk.length, position);
      if (read === 0) break;
      position += read;
      let start = 0;
      for (let nl = chunk.indexOf(10); nl >= 0 && nl < read; nl = chunk.indexOf(10, start)) {
        parts.push(Buffer.from(chunk.subarray(start, nl)));
        yield Buffer.concat(parts).toString("utf8");
        parts = []; start = nl + 1;
      }
      if (start < read) parts.push(Buffer.from(chunk.subarray(start, read)));
    }
    if (parts.length > 0) yield Buffer.concat(parts).toString("utf8");
  } finally { closeSync(fd); }
}

/** The carried text of one source line: `{text, kind}` with kind "row" (verified compact) or "through". */
export function carryLine(source, date) {
  let value;
  try { value = JSON.parse(source); } catch { return { text: source, kind: "through" }; }
  if (value === null || typeof value !== "object" || Array.isArray(value) || !Object.keys(value).every((key) => ROW_KEYS.has(key)) || !["e", "a", "v"].every((key) => Array.isArray(value[key]))) return { text: source, kind: "through" };
  const t = value.t ?? value.at;
  let row;
  try { row = seavtRow({ e: value.e, a: value.a, v: value.v, t }); } catch { return { text: source, kind: "through" }; }
  const at = typeof value.at === "string" ? value.at : undefined;
  let line;
  try { line = lineOfRow(row, { at: at ?? atOf(row) }); } catch { line = lineOfRow(row, { at: `${date}T00:00:00.000Z` }); }
  const text = JSON.stringify(line);
  const back = rowOfLine(JSON.parse(text));
  if (!rowsEqual(back, row)) return { text: source, kind: "through" };
  return { text, kind: "row" };
}

const sha256 = (file) => new Promise((resolve, reject) => {
  const hash = createHash("sha256");
  createReadStream(file).on("data", (d) => hash.update(d)).on("end", () => resolve(hash.digest("hex"))).on("error", reject);
});

/** Convert one source file in `directory`. Returns the report row. */
export async function compactFile(directory, name, { remove = false } = {}) {
  const date = SOURCE.exec(name)[1], source = join(directory, name);
  const report = { file: name, date, rows: 0, through: 0, before: statSync(source).size, after: 0, status: "converted" };
  if (existsSync(`${source}.compacted`)) return { ...report, status: "already-converted" };
  const temporary = join(directory, `.${date}.compact.${process.pid}.jsonl`);
  const out = openSync(temporary, "w", 0o644);
  let lines = 0, largest = 0;
  try {
    for (const raw of fileLines(source)) {
      if (raw.trim() === "") continue;
      const { text, kind } = carryLine(raw, date);
      const bytes = Buffer.byteLength(text, "utf8");
      largest = Math.max(largest, bytes);
      if (bytes > SEAVT_ROW_BYTES_MAX) return { ...report, status: `skipped: line ${lines + 1} is ${bytes} bytes, over the ${SEAVT_ROW_BYTES_MAX}-byte row bound` };
      writeSync(out, `${text}\n`);
      lines += 1;
      if (kind === "row") report.rows += 1; else report.through += 1;
    }
    fsyncSync(out);
  } catch (error) { closeSync(out); unlinkSync(temporary); throw error; }
  closeSync(out);
  if (lines === 0) { unlinkSync(temporary); return { ...report, status: "empty" }; }
  let segment;
  try {
    const last = segmentsOf(readdirSync(directory), date).at(-1);
    segment = writeSegment(directory, date, temporary, last?.end ?? 0);
    // Read the segment back and hold it to the carried lines, byte for byte.
    const expected = fileLines(temporary);
    let count = 0;
    for (const { text } of segmentLines(join(directory, segment.name), segment.start, segment.start)) {
      const next = expected.next();
      if (next.done || next.value !== text) throw new Error(`${segment.name}: line ${count + 1} does not read back as written`);
      count += 1;
    }
    if (!expected.next().done || count !== lines) throw new Error(`${segment.name}: read back ${count} lines of ${lines}`);
  } catch (error) {
    if (segment) { try { unlinkSync(join(directory, segment.name)); } catch { /* none */ } }
    throw error;
  } finally { unlinkSync(temporary); }
  report.after = statSync(join(directory, segment.name)).size;
  report.segment = segment.name;
  if (remove) unlinkSync(source);
  else if (name === `${date}.jsonl`) renameSync(source, `${source}.legacy`);
  else writeFileSync(`${source}.compacted`, `${JSON.stringify({ profile: "seavt-row-json-carrier/1", segment: segment.name, rows: report.rows, through: report.through, sourceBytes: report.before, sourceSha256: await sha256(source) })}\n`);
  return report;
}

/** Convert every SEAVT feed under `root`'s data/logs (or only `feeds`); returns the report rows with their feed. */
export async function compactRoot(root, { remove = false, feeds, log = () => {} } = {}) {
  const logs = join(root, "data", "logs"), reports = [];
  let names = [];
  try { names = readdirSync(logs).filter((n) => n.endsWith("-seavt-logs")).sort(); } catch (error) { if (error.code !== "ENOENT") throw error; }
  for (const dir of names) {
    const feed = dir.slice(0, -"-logs".length);
    if (feeds?.length && !feeds.includes(feed)) continue;
    const directory = join(logs, dir);
    for (const name of readdirSync(directory).filter((n) => SOURCE.test(n)).sort()) {
      const report = { feed, ...(await compactFile(directory, name, { remove })) };
      log(report);
      reports.push(report);
    }
  }
  return reports;
}

export { logsDirectory };
