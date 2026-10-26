/**
 * Admit JSONL files an earlier release left behind into a journal, once, a bounded step at a time.
 * The files are read only, in order, under the journal's writer lock (`<root>/.lock`, the lock
 * `withDirectoryLock` and the ledger journals' `exclusively` both take). A record whose identity
 * the journal held before the admission began is skipped; repeats within a file are admitted, as
 * the file recorded them.
 *
 * Each call admits at most `limit` lines and returns, so opening a store over a large legacy file
 * never does unbounded work: a cursor beside the marker (`jsonl-admission.cursor.json`) keeps the
 * byte offset reached in each file and the identities held before the admission began, rewritten
 * after every record, and the next call continues from it. When every file is through, the marker
 * (`jsonl-admission.json` by default, written with `wx`) records the counts and the admission never
 * runs again. Until then `readAdmittingJsonl` reads a category as the journal plus the part of its
 * files not yet admitted, so nothing is missed mid-admission.
 *
 * `journal` is `{ root, record(category, record), read(category) }`; `sources` is a list of
 * `{ path, category }`, and a missing file is passed over; `mode` sets the marker's and cursor's file
 * mode. Call it outside the journal's lock.
 */
import { createHash } from "node:crypto";
import { closeSync, existsSync, openSync, readFileSync, readSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { withDirectoryLock } from "./journal/filesystem/directory-lock.mjs";

export const JSONL_ADMISSION_MARKER = "jsonl-admission.json";
export const JSONL_ADMISSION_LIMIT = 1000;
const recordId = (record) => (typeof record?.id === "string" ? record.id : undefined);
const digest = (id) => createHash("sha256").update(String(id)).digest("hex");
const cursorName = (marker) => `${marker.replace(/\.json$/u, "")}.cursor.json`;

function checked(journal, sources) {
  if (typeof journal?.root !== "string" || typeof journal.record !== "function" || typeof journal.read !== "function") {
    throw new TypeError("admitJsonlOnce needs a journal with root, record(category, record) and read(category)");
  }
  if (!Array.isArray(sources) || sources.some((source) => typeof source?.path !== "string" || typeof source?.category !== "string")) {
    throw new TypeError("admitJsonlOnce sources are { path, category } entries");
  }
  return resolve(journal.root);
}

/** Lines of `path` from byte `offset`, at most `limit` of them (all when `limit` is Infinity), each with the offset just past it. */
function linesFrom(path, offset, limit) {
  const found = [], descriptor = openSync(path, "r"), buffer = Buffer.alloc(64 * 1024);
  let position = offset, pending = Buffer.alloc(0);
  try {
    while (found.length < limit) {
      const bytes = readSync(descriptor, buffer, 0, buffer.length, position);
      if (bytes === 0) {
        if (pending.length > 0) found.push({ text: pending.toString("utf8"), end: position });
        break;
      }
      position += bytes;
      let chunk = Buffer.concat([pending, buffer.subarray(0, bytes)]), start = 0, at;
      const base = position - chunk.length;
      while (found.length < limit && (at = chunk.indexOf(10, start)) !== -1) {
        found.push({ text: chunk.subarray(start, at).toString("utf8"), end: base + at + 1 });
        start = at + 1;
      }
      if (found.length >= limit) break;
      pending = chunk.subarray(start);
    }
  } finally { closeSync(descriptor); }
  return found;
}

function readCursor(root, marker) {
  const path = join(root, cursorName(marker));
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : undefined;
}

/** The cursor an admission starts from: every file at its start, and the identities the journal holds now. */
function startingCursor(journal, sources, identity) {
  const held = {};
  for (const category of new Set(sources.map((source) => source.category))) {
    held[category] = [...new Set(journal.read(category).map(identity).filter((id) => id !== undefined).map(digest))];
  }
  return { version: 1, offsets: sources.map(() => 0), counts: {}, held };
}

export function admitJsonlOnce(journal, sources, { identity = recordId, marker = JSONL_ADMISSION_MARKER, type = "JsonlAdmission", from, mode, limit = JSONL_ADMISSION_LIMIT } = {}) {
  const root = checked(journal, sources);
  if (!(limit > 0)) throw new TypeError("admitJsonlOnce limit must be positive");
  const markerPath = join(root, marker);
  if (existsSync(markerPath)) return { done: true, admitted: 0, counts: null };
  return withDirectoryLock(root, () => {
    if (existsSync(markerPath)) return { done: true, admitted: 0, counts: null };
    const cursor = readCursor(root, marker) ?? startingCursor(journal, sources, identity);
    const held = Object.fromEntries(Object.entries(cursor.held).map(([category, ids]) => [category, new Set(ids)]));
    const cursorPath = join(root, cursorName(marker));
    const keep = () => {
      writeFileSync(`${cursorPath}.next`, `${JSON.stringify({ type: `${type}Cursor`, ...cursor })}\n`, mode === undefined ? {} : { mode });
      renameSync(`${cursorPath}.next`, cursorPath);
    };
    let budget = limit, admitted = 0;
    for (const [index, { path, category }] of sources.entries()) {
      if (budget === 0) break;
      if (!existsSync(path)) continue;
      for (const { text, end } of linesFrom(path, cursor.offsets[index], budget)) {
        budget -= 1;
        if (text.trim()) {
          const record = JSON.parse(text);
          const id = identity(record);
          if (id === undefined || !held[category].has(digest(id))) {
            journal.record(category, record);
            cursor.counts[category] = (cursor.counts[category] ?? 0) + 1;
            admitted += 1;
          }
        }
        cursor.offsets[index] = end;
        keep();
      }
    }
    const through = sources.every(({ path }, index) => !existsSync(path) || linesFrom(path, cursor.offsets[index], 1).length === 0);
    if (!through) { keep(); return { done: false, admitted, counts: { ...cursor.counts } }; }
    writeFileSync(markerPath, `${JSON.stringify({ type, version: 1, ...(from === undefined ? {} : { from }), at: new Date().toISOString(), counts: cursor.counts })}\n`, { flag: "wx", ...(mode === undefined ? {} : { mode }) });
    return { done: true, admitted, counts: { ...cursor.counts } };
  });
}

/**
 * `category` as the journal holds it, followed, while an admission is still under way, by the
 * records of its files not yet admitted (skipping identities held before the admission began, as
 * admission will). Once the marker is written this is the journal's own read.
 */
export function readAdmittingJsonl(journal, sources, category, { identity = recordId, marker = JSONL_ADMISSION_MARKER } = {}) {
  const root = checked(journal, sources);
  const kept = journal.read(category);
  if (existsSync(join(root, marker))) return kept;
  const cursor = readCursor(root, marker) ?? startingCursor(journal, sources, identity);
  const held = new Set(cursor.held[category] ?? []);
  const pending = [];
  for (const [index, source] of sources.entries()) {
    if (source.category !== category || !existsSync(source.path)) continue;
    for (const { text } of linesFrom(source.path, cursor.offsets[index], Infinity)) {
      if (!text.trim()) continue;
      const record = JSON.parse(text);
      const id = identity(record);
      if (id === undefined || !held.has(digest(id))) pending.push(record);
    }
  }
  return [...kept, ...pending];
}
