import { closeSync, openSync, readSync, lstatSync } from "node:fs";

const SQLITE_HEADER = "SQLite format 3\u0000";

/** Whether `file` is an SQLite database (its first sixteen bytes are the SQLite header). */
export function isSqliteFile(file) {
  let descriptor;
  try { descriptor = openSync(file, "r"); } catch { return false; }
  try {
    const header = Buffer.alloc(16);
    return readSync(descriptor, header, 0, 16, 0) === 16 && header.toString("latin1") === SQLITE_HEADER;
  } finally { closeSync(descriptor); }
}

/** Refuse any unresolved earlier file or orphan SQLite sidecar before native mutation. */
export function assertLegacyIndexAbsent(file) {
  if (file === undefined || file === null || file === ":memory:") return;
  if (typeof file !== "string" || file.length === 0) throw new TypeError("full-text index file must be a nonempty path");
  for (const path of [file, `${file}-wal`, `${file}-shm`, `${file}-journal`]) {
    try { lstatSync(path); }
    catch (error) { if (error.code === "ENOENT") continue; throw error; }
    const error = new Error(`Unresolved historical full-text index carrier requires explicit offline receiving: ${path}`);
    error.code = "ERR_HISTORICAL_FULL_TEXT_INDEX_UNRECEIVED";
    error.path = path;
    throw error;
  }
}
